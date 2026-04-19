import { appendFile, mkdir } from "node:fs/promises";
import type { DockerClient } from "../docker-connection.js";
import { journaliserMoteur } from "../observabilite/journal-json.js";
import {
  cheminFichierLogPourId,
  formaterLigneEvenementMoteur,
  lireRepertoireJournauxConteneurs,
  resoudreIdCompletConteneur,
} from "./journaux-fichier-conteneur.identifiant-chemin-format.js";
import { SuiviSortieJournauxVersFichier } from "./journaux-fichier-conteneur.suivi-sortie-vers-fichier.js";

/** Métadonnées minimales enregistrées à la création (aucun secret : pas de variables d’environnement). */
export type MetaCreationConteneurPourJournal = {
  /** Référence Docker réellement injectée dans la création (`Image`). */
  referenceDockerEffective: string;
  /** Présent uniquement lorsque la création passe par le catalogue KidoPanel. */
  idCatalogueImage?: string;
  nomConteneur?: string;
  hostname?: string;
  idRequete?: string;
};

/**
 * Écrit un journal texte par conteneur : événements du moteur et copie continue de la sortie Docker après chaque démarrage.
 */
export class ServiceJournauxFichierConteneur {
  private readonly repertoire: string;

  private readonly suiviSortieVersFichier: SuiviSortieJournauxVersFichier;

  constructor(
    private readonly docker: DockerClient,
    repertoire?: string,
  ) {
    this.repertoire = repertoire ?? lireRepertoireJournauxConteneurs();
    this.suiviSortieVersFichier = new SuiviSortieJournauxVersFichier(
      this.docker,
      this.repertoire,
    );
  }

  /** Répertoire absolu où sont écrits les fichiers `<id>.log` (utile pour vérification sans deviner le `cwd`). */
  obtenirRepertoireAbsolu(): string {
    return this.repertoire;
  }

  private async assurerRepertoire(): Promise<void> {
    await mkdir(this.repertoire, { recursive: true });
  }

  private async ecrireEvenement(
    idComplet: string,
    libelleEvenement: string,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    await this.assurerRepertoire();
    const ligne = formaterLigneEvenementMoteur(libelleEvenement, meta);
    await appendFile(cheminFichierLogPourId(this.repertoire, idComplet), ligne, {
      encoding: "utf8",
    });
  }

  /**
   * Enregistre la création du conteneur sur disque (état « created » côté Docker).
   */
  async notifierCreation(
    idReference: string,
    meta: MetaCreationConteneurPourJournal,
  ): Promise<void> {
    try {
      const idComplet = await resoudreIdCompletConteneur(this.docker, idReference);
      await this.ecrireEvenement(idComplet, "conteneur_cree", {
        idConteneur: idComplet,
        referenceDockerEffective: meta.referenceDockerEffective,
        ...(meta.idCatalogueImage === undefined
          ? {}
          : { idCatalogueImage: meta.idCatalogueImage }),
        nomConteneur: meta.nomConteneur,
        hostname: meta.hostname,
        idRequete: meta.idRequete,
      });
    } catch (error_) {
      journaliserMoteur({
        niveau: "warn",
        message: "journal_fichier_conteneur_echec_creation",
        metadata: {
          idReference,
          erreur: error_ instanceof Error ? error_.message : String(error_),
        },
      });
    }
  }

  /**
   * Enregistre le démarrage réussi puis lance en arrière-plan la copie des journaux Docker vers le fichier `.log`.
   */
  notifierDemarrageEtDemarrerSuiviSortie(
    idReference: string,
    depuisEpochSecondes: number,
    meta?: { idRequete?: string },
  ): void {
    this.notifierDemarrageEtDemarrerSuiviSortieAsync(
      idReference,
      depuisEpochSecondes,
      meta,
    ).catch(() => {});
  }

  private async notifierDemarrageEtDemarrerSuiviSortieAsync(
    idReference: string,
    depuisEpochSecondes: number,
    meta?: { idRequete?: string },
  ): Promise<void> {
    let idComplet: string;
    try {
      idComplet = await resoudreIdCompletConteneur(this.docker, idReference);
    } catch (error_) {
      journaliserMoteur({
        niveau: "warn",
        message: "journal_fichier_conteneur_echec_resolution_id_demarrage",
        metadata: {
          idReference,
          erreur: error_ instanceof Error ? error_.message : String(error_),
        },
      });
      return;
    }

    try {
      await this.ecrireEvenement(idComplet, "conteneur_demarre", {
        idConteneur: idComplet,
        depuisEpochSecondes,
        idRequete: meta?.idRequete,
      });
    } catch (error_) {
      journaliserMoteur({
        niveau: "warn",
        message: "journal_fichier_conteneur_echec_ecriture_demarrage",
        metadata: {
          idConteneur: idComplet,
          erreur: error_ instanceof Error ? error_.message : String(error_),
        },
      });
    }

    await this.suiviSortieVersFichier.remplacerSuiviPourConteneur(
      idReference,
      idComplet,
      depuisEpochSecondes,
      (id, libelle, metaEvenement) =>
        this.ecrireEvenement(id, libelle, metaEvenement),
      () => this.assurerRepertoire(),
    );
  }

  /**
   * Coupe le flux de copie de sortie Docker vers le fichier (appel typique avant arrêt ou suppression).
   */
  async arreterSuiviSortie(idReference: string): Promise<void> {
    await this.suiviSortieVersFichier.arreterSuiviPourReference(idReference);
  }

  async notifierArret(idReference: string, meta?: { delaiSeconde?: number }): Promise<void> {
    try {
      const idComplet = await resoudreIdCompletConteneur(this.docker, idReference);
      await this.ecrireEvenement(idComplet, "conteneur_arrete", {
        idConteneur: idComplet,
        delaiSeconde: meta?.delaiSeconde,
      });
    } catch (error_) {
      journaliserMoteur({
        niveau: "warn",
        message: "journal_fichier_conteneur_echec_ecriture_arret",
        metadata: {
          idReference,
          erreur: error_ instanceof Error ? error_.message : String(error_),
        },
      });
    }
  }

  /**
   * Écrit l’événement de suppression après que Docker a retiré le conteneur (plus d’`inspect` possible).
   */
  async notifierSuppressionApresDocker(
    idComplet: string,
    meta?: { force?: boolean },
  ): Promise<void> {
    try {
      await this.ecrireEvenement(idComplet, "conteneur_supprime", {
        idConteneur: idComplet,
        force: meta?.force ?? false,
      });
    } catch (error_) {
      journaliserMoteur({
        niveau: "warn",
        message: "journal_fichier_conteneur_echec_ecriture_suppression",
        metadata: {
          idConteneur: idComplet,
          erreur: error_ instanceof Error ? error_.message : String(error_),
        },
      });
    }
  }

  async obtenirIdCompletSiPossible(idReference: string): Promise<string | undefined> {
    try {
      return await resoudreIdCompletConteneur(this.docker, idReference);
    } catch {
      return undefined;
    }
  }

  async notifierLectureJournauxJson(
    idReference: string,
    meta: { nombreLignes?: number; horodatages: boolean },
  ): Promise<void> {
    try {
      const idComplet = await resoudreIdCompletConteneur(this.docker, idReference);
      await this.ecrireEvenement(idComplet, "lecture_journaux_json_api", {
        idConteneur: idComplet,
        nombreLignes: meta.nombreLignes,
        horodatages: meta.horodatages,
      });
    } catch {
      /* conteneur peut être absent : pas d’événement fichier */
    }
  }
}

export function creerServiceJournauxFichierConteneur(
  docker: DockerClient,
): ServiceJournauxFichierConteneur {
  return new ServiceJournauxFichierConteneur(docker);
}
