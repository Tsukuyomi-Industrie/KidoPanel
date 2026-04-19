import type { ContainerInspectInfo } from "dockerode";
import {
  type CreateContainerResult,
  type ContainerCreateSpec,
  type ContainerSummary,
} from "./types.js";
import { isContainerEngineError } from "./errors.js";
import {
  createDockerClient,
  type DockerClient,
  type DockerConnectionOptions,
} from "./docker-connection.js";
import { executerTirageImageDocker } from "./docker/image.service.js";
import {
  estErreurArretConteneurDejaArrete,
  wrapDockerError,
} from "./docker/wrap-docker-operation.js";
import {
  lireJournauxConteneur,
  ouvrirFluxSuiviJournaux,
  type FluxSuiviJournaux,
} from "./container-engine-logs.js";
import { creerServiceTirageImageMoteur } from "./image-puller.service.js";
import type { ServiceTirageImageMoteur } from "./image-puller.service.js";
import { resoudreImagePourCreation } from "./image-validator.service.js";
import { executerCreationConteneurDocker } from "./docker/executer-creation-conteneur-docker.js";
import {
  creerReseauPontUtilisateurDocker,
  supprimerReseauPontParNomDocker,
} from "./docker/reseau-utilisateur-docker.service.js";
import { journaliserMoteur } from "./observabilite/journal-json.js";
import {
  creerServiceJournauxFichierConteneur,
  type ServiceJournauxFichierConteneur,
} from "./journaux-fichier-conteneur/journaux-fichier-conteneur.service.js";
import { mapEntreeListeDockerVersResume } from "./conteneur-liste-docker.mapper.js";
import {
  executerCommandeDansConteneurDocker,
  type ResultatExecConteneurDocker,
} from "./docker/exec-commande-conteneur-docker.service.js";
import {
  construireSuggestionConfigurationDepuisInspectionImage,
  type SuggestionConfigurationImageDocker,
} from "./docker/suggestion-config-depuis-image.service.js";
import {
  type GestionnairePareFeuHoteKidopanel,
  creerGestionnairePareFeuHoteKidopanelDepuisEnv,
} from "./pare-feu/gestionnaire-pare-feu-hote-kidopanel.js";

/** Options du constructeur : client injecté ou paramètres de connexion explicites. */
export interface ContainerEngineOptions {
  docker?: DockerClient;
  connection?: DockerConnectionOptions;
  /**
   * Service de journaux `.log` par conteneur : instance dédiée, ou `false` pour désactiver (tests).
   */
  journauxFichierConteneur?: ServiceJournauxFichierConteneur | false;
  /**
   * Gestion pare-feu hôte (firewalld) pour les ports publiés : instance injectée, `false` pour désactiver,
   * ou défaut `undefined` pour lire `CONTAINER_ENGINE_PAREFEU_AUTO`.
   */
  pareFeuHote?: GestionnairePareFeuHoteKidopanel | false;
}

/**
 * Façade sur Docker Engine : création, démarrage, arrêt, suppression, liste,
 * inspection, tirage d’image catalogue et lecture des journaux.
 */
export class ContainerEngine {
  private readonly docker: DockerClient;
  private readonly serviceTirageImage: ServiceTirageImageMoteur;
  private readonly journauxFichierConteneur: ServiceJournauxFichierConteneur | undefined;
  private readonly pareFeuHote: GestionnairePareFeuHoteKidopanel | undefined;

  constructor(options?: ContainerEngineOptions) {
    if (options?.docker) {
      this.docker = options.docker;
    } else {
      this.docker = createDockerClient(options?.connection);
    }
    this.serviceTirageImage = creerServiceTirageImageMoteur(this.docker);
    if (options?.journauxFichierConteneur === false) {
      this.journauxFichierConteneur = undefined;
    } else {
      this.journauxFichierConteneur =
        options?.journauxFichierConteneur ??
        creerServiceJournauxFichierConteneur(this.docker);
    }
    if (options?.pareFeuHote === false) {
      this.pareFeuHote = undefined;
    } else if (options?.pareFeuHote) {
      this.pareFeuHote = options.pareFeuHote;
    } else {
      this.pareFeuHote = creerGestionnairePareFeuHoteKidopanelDepuisEnv();
    }
  }

  /** Indique si le démon répond au ping. */
  async ping(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (e) {
      wrapDockerError(e);
    }
  }

  async listContainers(all = false): Promise<ContainerSummary[]> {
    try {
      const list = await this.docker.listContainers({ all });
      return list.map(mapEntreeListeDockerVersResume);
    } catch (e) {
      wrapDockerError(e);
    }
  }

  async inspectContainer(id: string): Promise<ContainerInspectInfo> {
    try {
      const container = this.docker.getContainer(id);
      return await container.inspect();
    } catch (e) {
      wrapDockerError(e);
    }
  }

  /**
   * Exécute une commande dans le conteneur (configuration générée, rechargement Nginx, etc.).
   */
  async executerCommandeDansConteneur(
    id: string,
    cmd: readonly string[],
    stdinUtf8?: string,
  ): Promise<ResultatExecConteneurDocker> {
    try {
      return await executerCommandeDansConteneurDocker(
        this.docker,
        id,
        cmd,
        stdinUtf8,
      );
    } catch (e) {
      wrapDockerError(e);
    }
  }

  /**
   * Crée un conteneur : validation catalogue, tirage contrôlé si l’image manque localement,
   * puis appel Docker avec la référence résolue.
   */
  async createContainer(
    spec: ContainerCreateSpec,
    options?: { requestId?: string },
  ): Promise<CreateContainerResult> {
    return executerCreationConteneurDocker(
      {
        docker: this.docker,
        serviceTirageImage: this.serviceTirageImage,
        journauxFichierConteneur: this.journauxFichierConteneur,
      },
      spec,
      options,
    );
  }

  /**
   * Propose cmd, entrypoint, ports et variables à partir du manifeste d’image après tirage local.
   */
  async obtenirSuggestionConfigurationPourImageDocker(
    params: Pick<ContainerCreateSpec, "imageCatalogId" | "imageReference">,
    options?: { requestId?: string },
  ): Promise<SuggestionConfigurationImageDocker> {
    const specPartiel = params as ContainerCreateSpec;
    const resolu = resoudreImagePourCreation(specPartiel, options?.requestId);
    const metaTirage =
      resolu.mode === "catalogue"
        ? {
            mode: "catalogue" as const,
            idCatalogue: resolu.idCatalogue,
            referenceDocker: resolu.referenceDocker,
          }
        : { mode: "libre" as const, referenceDocker: resolu.referenceDocker };
    await this.serviceTirageImage.garantirPresenceImagePourCreation(
      metaTirage,
      options?.requestId,
    );
    try {
      const inspection = await this.docker.getImage(resolu.referenceDocker).inspect();
      return construireSuggestionConfigurationDepuisInspectionImage(
        resolu.referenceDocker,
        inspection,
      );
    } catch (e) {
      wrapDockerError(e);
    }
  }

  /**
   * Crée un pont bridge Docker avec une plage IPv4 dédiée (nom imposé par la passerelle).
   */
  async creerReseauPontUtilisateur(
    params: Parameters<typeof creerReseauPontUtilisateurDocker>[1],
    options?: { requestId?: string },
  ): Promise<Awaited<ReturnType<typeof creerReseauPontUtilisateurDocker>>> {
    return creerReseauPontUtilisateurDocker(this.docker, params, options);
  }

  /** Supprime un pont créé via {@link creerReseauPontUtilisateur} lorsque la base confirme qu’aucune instance ne l’emploie. */
  async supprimerReseauPontUtilisateurParNom(
    nomDocker: string,
    options?: { requestId?: string },
  ): Promise<void> {
    return supprimerReseauPontParNomDocker(this.docker, nomDocker, options);
  }

  async startContainer(id: string): Promise<void> {
    const depuisEpochSecondes = Math.floor(Date.now() / 1000) - 1;
    try {
      const container = this.docker.getContainer(id);
      await container.start();
    } catch (e) {
      wrapDockerError(e);
    }
    await this.pareFeuHote?.apresDemarrageConteneur(id, this.docker);
    this.journauxFichierConteneur?.notifierDemarrageEtDemarrerSuiviSortie(
      id,
      depuisEpochSecondes,
    );
  }

  async stopContainer(id: string, timeoutSeconds = 10): Promise<void> {
    try {
      const container = this.docker.getContainer(id);
      await container.stop({ t: timeoutSeconds });
    } catch (e) {
      if (estErreurArretConteneurDejaArrete(e)) {
        void this.journauxFichierConteneur?.arreterSuiviSortie(id);
        void this.journauxFichierConteneur
          ?.notifierArret(id, { delaiSeconde: timeoutSeconds })
          .catch(() => {});
        return;
      }
      wrapDockerError(e);
    }
    void this.journauxFichierConteneur?.arreterSuiviSortie(id);
    void this.journauxFichierConteneur
      ?.notifierArret(id, { delaiSeconde: timeoutSeconds })
      .catch(() => {});
  }

  async removeContainer(id: string, options?: { force?: boolean }): Promise<void> {
    await this.pareFeuHote?.avantSuppressionConteneur(id);
    const idComplet = await this.journauxFichierConteneur?.obtenirIdCompletSiPossible(id);
    await this.journauxFichierConteneur?.arreterSuiviSortie(id);
    try {
      const container = this.docker.getContainer(id);
      await container.remove({ force: options?.force });
    } catch (e) {
      wrapDockerError(e);
    }
    if (idComplet !== undefined) {
      void this.journauxFichierConteneur
        ?.notifierSuppressionApresDocker(idComplet, { force: options?.force })
        .catch(() => {});
    }
  }

  /**
   * Force le tirage d’une image catalogue depuis le registre (même si une couche locale existe).
   */
  async pullImage(
    params: Pick<ContainerCreateSpec, "imageCatalogId" | "imageReference">,
    options?: { requestId?: string },
  ): Promise<void> {
    const requestId = options?.requestId;
    const resolu = resoudreImagePourCreation(
      params as ContainerCreateSpec,
      requestId,
    );
    const ref = resolu.referenceDocker;
    journaliserMoteur({
      niveau: "info",
      message: "image_pull_start",
      requestId,
      metadata:
        resolu.mode === "catalogue"
          ? {
              idCatalogue: resolu.idCatalogue,
              referenceDocker: ref,
              mode: "pull_force",
            }
          : {
              referenceDocker: ref,
              mode: "pull_force",
              modeImageReferenceLibre: true,
            },
    });
    try {
      await executerTirageImageDocker(this.docker, ref);
    } catch (err) {
      journaliserMoteur({
        niveau: "error",
        message: "image_pull_failed",
        requestId,
        metadata:
          resolu.mode === "catalogue"
            ? {
                idCatalogue: resolu.idCatalogue,
                referenceDocker: ref,
                codeErreur: isContainerEngineError(err) ? err.code : "inconnu",
                mode: "pull_force",
              }
            : {
                referenceDocker: ref,
                codeErreur: isContainerEngineError(err) ? err.code : "inconnu",
                mode: "pull_force",
                modeImageReferenceLibre: true,
              },
      });
      throw err;
    }
    journaliserMoteur({
      niveau: "info",
      message: "image_pull_success",
      requestId,
      metadata:
        resolu.mode === "catalogue"
          ? {
              idCatalogue: resolu.idCatalogue,
              referenceDocker: ref,
              mode: "pull_force",
            }
          : {
              referenceDocker: ref,
              mode: "pull_force",
              modeImageReferenceLibre: true,
            },
    });
  }

  /**
   * Retourne les journaux concaténés (stdout et stderr) pour une réponse JSON ponctuelle.
   */
  async getLogs(
    id: string,
    options?: { tail?: number; timestamps?: boolean },
  ): Promise<string> {
    const texte = await lireJournauxConteneur(this.docker, id, options);
    void this.journauxFichierConteneur
      ?.notifierLectureJournauxJson(id, {
        nombreLignes: options?.tail,
        horodatages: options?.timestamps ?? false,
      })
      .catch(() => {});
    return texte;
  }

  /**
   * Répertoire absolu des fichiers `.log` par conteneur, ou `undefined` si l’écriture disque est désactivée.
   */
  obtenirRepertoireJournauxFichierConteneur(): string | undefined {
    return this.journauxFichierConteneur?.obtenirRepertoireAbsolu();
  }

  /**
   * Ouvre un flux Docker en suivi continu (`follow`) pour exposition SSE ou proxy HTTP.
   */
  openLogFollowStream(
    id: string,
    options?: { tail?: number; timestamps?: boolean },
  ): Promise<FluxSuiviJournaux> {
    return ouvrirFluxSuiviJournaux(this.docker, id, options);
  }

  /** Accès bas niveau au client Docker pour les cas avancés. */
  get raw(): DockerClient {
    return this.docker;
  }
}
