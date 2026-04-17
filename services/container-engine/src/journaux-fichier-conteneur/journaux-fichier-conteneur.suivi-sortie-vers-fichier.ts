import { createWriteStream } from "node:fs";
import { appendFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import type { DockerClient } from "../docker-connection.js";
import { ouvrirFluxSuiviJournaux } from "../container-engine-logs.js";
import { journaliserMoteur } from "../observabilite/journal-json.js";
import {
  cheminFichierLogPourId,
  formaterLigneEvenementMoteur,
  resoudreIdCompletConteneur,
} from "./journaux-fichier-conteneur.identifiant-chemin-format.js";

type EntreeSuiviSortie = {
  fermer: () => void;
};

/**
 * Gère les flux Docker `follow` pipés vers le fichier `.log` (une entrée active par identifiant canonique).
 */
export class SuiviSortieJournauxVersFichier {
  private readonly suivisSortie = new Map<string, EntreeSuiviSortie>();

  constructor(
    private readonly docker: DockerClient,
    private readonly repertoire: string,
  ) {}

  async remplacerSuiviPourConteneur(
    idReference: string,
    idComplet: string,
    depuisEpochSecondes: number,
    ecrireEvenementSurDisque: (
      id: string,
      libelle: string,
      meta?: Record<string, unknown>,
    ) => Promise<void>,
    assurerRepertoire: () => Promise<void>,
  ): Promise<void> {
    const precedent = this.suivisSortie.get(idComplet);
    precedent?.fermer();

    let flux: Awaited<ReturnType<typeof ouvrirFluxSuiviJournaux>>;
    try {
      flux = await ouvrirFluxSuiviJournaux(this.docker, idReference, {
        since: depuisEpochSecondes,
        timestamps: true,
      });
    } catch (erreur) {
      journaliserMoteur({
        niveau: "warn",
        message: "journal_fichier_conteneur_echec_ouverture_flux_sortie",
        metadata: {
          idConteneur: idComplet,
          erreur: erreur instanceof Error ? erreur.message : String(erreur),
        },
      });
      try {
        await ecrireEvenementSurDisque(idComplet, "copie_sortie_docker_impossible", {
          idConteneur: idComplet,
          erreur: erreur instanceof Error ? erreur.message : String(erreur),
        });
      } catch {
        /* déjà journalisé côté moteur JSON */
      }
      return;
    }

    await assurerRepertoire();
    const cheminLog = cheminFichierLogPourId(this.repertoire, idComplet);
    const fluxEcriture = createWriteStream(cheminLog, { flags: "a" });
    const entreeCourante: EntreeSuiviSortie = {
      fermer: () => {
        flux.fermer();
        fluxEcriture.destroy();
      },
    };
    this.suivisSortie.set(idComplet, entreeCourante);

    const banniere = formaterLigneEvenementMoteur("copie_sortie_docker_depuis_secondes", {
      idConteneur: idComplet,
      depuisEpochSecondes,
    });
    fluxEcriture.write(banniere, "utf8");

    const lecture = flux.readable as Readable;
    void pipeline(lecture, fluxEcriture)
      .catch((erreur: unknown) => {
        const message =
          erreur instanceof Error ? erreur.message : String(erreur);
        journaliserMoteur({
          niveau: "warn",
          message: "journal_fichier_conteneur_pipeline_sortie_terminee_erreur",
          metadata: { idConteneur: idComplet, erreur: message },
        });
        void appendFile(
          cheminLog,
          formaterLigneEvenementMoteur("copie_sortie_docker_interrompue", {
            idConteneur: idComplet,
            erreur: message,
          }),
          "utf8",
        ).catch(() => {});
      })
      .finally(() => {
        const encore = this.suivisSortie.get(idComplet);
        if (encore === entreeCourante) {
          this.suivisSortie.delete(idComplet);
        }
        if (!fluxEcriture.destroyed) {
          fluxEcriture.end();
        }
      });
  }

  async arreterSuiviPourReference(idReference: string): Promise<void> {
    let idComplet: string;
    try {
      idComplet = await resoudreIdCompletConteneur(this.docker, idReference);
    } catch {
      return;
    }
    const entree = this.suivisSortie.get(idComplet);
    if (!entree) {
      return;
    }
    entree.fermer();
    this.suivisSortie.delete(idComplet);
  }
}
