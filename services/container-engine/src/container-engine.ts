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
import { traduireOptionsCreationConteneur } from "./docker/traduction-options-creation-conteneur.js";
import { creerServiceTirageImageCatalogue } from "./image-puller.service.js";
import { validerImageCatalogueAvantCreation } from "./image-validator.service.js";
import type { ServiceTirageImageCatalogue } from "./image-puller.service.js";
import { journaliserMoteur } from "./observabilite/journal-json.js";
import {
  creerServiceJournauxFichierConteneur,
  type ServiceJournauxFichierConteneur,
} from "./journaux-fichier-conteneur/journaux-fichier-conteneur.service.js";
import { mapEntreeListeDockerVersResume } from "./conteneur-liste-docker.mapper.js";

/** Options du constructeur : client injecté ou paramètres de connexion explicites. */
export interface ContainerEngineOptions {
  docker?: DockerClient;
  connection?: DockerConnectionOptions;
  /**
   * Service de journaux `.log` par conteneur : instance dédiée, ou `false` pour désactiver (tests).
   */
  journauxFichierConteneur?: ServiceJournauxFichierConteneur | false;
}

/**
 * Façade sur Docker Engine : création, démarrage, arrêt, suppression, liste,
 * inspection, tirage d’image catalogue et lecture des journaux.
 */
export class ContainerEngine {
  private readonly docker: DockerClient;
  private readonly serviceTirageCatalogue: ServiceTirageImageCatalogue;
  private readonly journauxFichierConteneur: ServiceJournauxFichierConteneur | undefined;

  constructor(options?: ContainerEngineOptions) {
    if (options?.docker) {
      this.docker = options.docker;
    } else {
      this.docker = createDockerClient(options?.connection);
    }
    this.serviceTirageCatalogue = creerServiceTirageImageCatalogue(this.docker);
    if (options?.journauxFichierConteneur === false) {
      this.journauxFichierConteneur = undefined;
    } else {
      this.journauxFichierConteneur =
        options?.journauxFichierConteneur ??
        creerServiceJournauxFichierConteneur(this.docker);
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
   * Crée un conteneur : validation catalogue, tirage contrôlé si l’image manque localement,
   * puis appel Docker avec la référence résolue.
   */
  async createContainer(
    spec: ContainerCreateSpec,
    options?: { requestId?: string },
  ): Promise<CreateContainerResult> {
    const requestId = options?.requestId;
    const entree = validerImageCatalogueAvantCreation(spec.imageCatalogId, requestId);
    await this.serviceTirageCatalogue.garantirImageCatalogueSurHote(entree, requestId);

    const opts = traduireOptionsCreationConteneur(spec, entree.referenceDocker);

    try {
      const container = await this.docker.createContainer(opts);
      journaliserMoteur({
        niveau: "info",
        message: "creation_conteneur_catalogue_terminee",
        requestId,
        metadata: {
          idConteneur: container.id,
          idCatalogue: entree.id,
          referenceDocker: entree.referenceDocker,
        },
      });
      const resultat: CreateContainerResult = {
        id: container.id,
        warnings: [],
      };
      void this.journauxFichierConteneur
        ?.notifierCreation(resultat.id, {
          idCatalogueImage: spec.imageCatalogId,
          nomConteneur: spec.name,
          hostname: spec.hostname,
          idRequete: requestId,
        })
        .catch(() => {});
      return resultat;
    } catch (e) {
      wrapDockerError(e);
    }
  }

  async startContainer(id: string): Promise<void> {
    const depuisEpochSecondes = Math.floor(Date.now() / 1000) - 1;
    try {
      const container = this.docker.getContainer(id);
      await container.start();
    } catch (e) {
      wrapDockerError(e);
    }
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
    imageCatalogId: string,
    options?: { requestId?: string },
  ): Promise<void> {
    const entree = validerImageCatalogueAvantCreation(imageCatalogId, options?.requestId);
    const requestId = options?.requestId;
    const ref = entree.referenceDocker;
    journaliserMoteur({
      niveau: "info",
      message: "image_pull_start",
      requestId,
      metadata: {
        idCatalogue: entree.id,
        referenceDocker: ref,
        mode: "pull_force",
      },
    });
    try {
      await executerTirageImageDocker(this.docker, ref);
    } catch (err) {
      journaliserMoteur({
        niveau: "error",
        message: "image_pull_failed",
        requestId,
        metadata: {
          idCatalogue: entree.id,
          referenceDocker: ref,
          codeErreur: isContainerEngineError(err) ? err.code : "inconnu",
          mode: "pull_force",
        },
      });
      throw err;
    }
    journaliserMoteur({
      niveau: "info",
      message: "image_pull_success",
      requestId,
      metadata: {
        idCatalogue: entree.id,
        referenceDocker: ref,
        mode: "pull_force",
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
