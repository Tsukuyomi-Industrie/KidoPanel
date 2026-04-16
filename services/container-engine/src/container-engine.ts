import type {
  ContainerInspectInfo,
  ContainerInfo,
} from "dockerode";
import {
  type CreateContainerResult,
  type ContainerCreateSpec,
  type ContainerStatus,
  type ContainerSummary,
} from "./types.js";
import { ContainerEngineError } from "./errors.js";
import {
  createDockerClient,
  type DockerClient,
  type DockerConnectionOptions,
} from "./docker-connection.js";
import {
  creerServiceImagesDocker,
  executerTirageImageDocker,
  type ServiceImagesDocker,
} from "./docker/image.service.js";
import { wrapDockerError } from "./docker/wrap-docker-operation.js";
import {
  lireJournauxConteneur,
  ouvrirFluxSuiviJournaux,
  type FluxSuiviJournaux,
} from "./container-engine-logs.js";
import { traduireOptionsCreationConteneur } from "./docker/traduction-options-creation-conteneur.js";

/** Normalise l’état brut Docker vers le type `ContainerStatus` du domaine. */
function mapDockerState(state: string | undefined): ContainerStatus {
  switch (state) {
    case "created":
    case "running":
    case "paused":
    case "restarting":
    case "removing":
    case "exited":
    case "dead":
      return state;
    default:
      return "unknown";
  }
}

/** Transforme une entrée de `listContainers` Docker en résumé métier. */
function mapListItem(c: ContainerInfo): ContainerSummary {
  const ports =
    c.Ports?.map((p) => ({
      privatePort: p.PrivatePort,
      publicPort: p.PublicPort,
      type: p.Type,
      ip: p.IP,
    })) ?? [];

  return {
    id: c.Id,
    names: c.Names ?? [],
    image: c.Image,
    imageId: c.ImageID,
    command: c.Command,
    created: c.Created,
    status: c.Status,
    state: mapDockerState(c.State),
    labels: c.Labels ?? {},
    ports,
  };
}

/** Options du constructeur : client injecté ou paramètres de connexion explicites. */
export interface ContainerEngineOptions {
  docker?: DockerClient;
  connection?: DockerConnectionOptions;
}

/**
 * Façade sur Docker Engine : création, démarrage, arrêt, suppression, liste,
 * inspection, tirage d’image et lecture des journaux.
 */
export class ContainerEngine {
  private readonly docker: DockerClient;
  private readonly serviceImages: ServiceImagesDocker;

  constructor(options?: ContainerEngineOptions) {
    if (options?.docker) {
      this.docker = options.docker;
    } else {
      this.docker = createDockerClient(options?.connection);
    }
    this.serviceImages = creerServiceImagesDocker(this.docker);
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
      return list.map(mapListItem);
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

  async createContainer(spec: ContainerCreateSpec): Promise<CreateContainerResult> {
    if (!spec.image?.trim()) {
      throw new ContainerEngineError(
        "INVALID_SPEC",
        "Une image de conteneur est obligatoire.",
      );
    }

    const referenceImage = spec.image.trim();

    const opts = traduireOptionsCreationConteneur({
      ...spec,
      image: referenceImage,
    });

    try {
      await this.serviceImages.ensureImageAvailable(referenceImage);
      const container = await this.docker.createContainer(opts);
      return {
        id: container.id,
        warnings: [],
      };
    } catch (e) {
      wrapDockerError(e);
    }
  }

  async startContainer(id: string): Promise<void> {
    try {
      const container = this.docker.getContainer(id);
      await container.start();
    } catch (e) {
      wrapDockerError(e);
    }
  }

  async stopContainer(id: string, timeoutSeconds = 10): Promise<void> {
    try {
      const container = this.docker.getContainer(id);
      await container.stop({ t: timeoutSeconds });
    } catch (e) {
      wrapDockerError(e);
    }
  }

  async removeContainer(id: string, options?: { force?: boolean }): Promise<void> {
    try {
      const container = this.docker.getContainer(id);
      await container.remove({ force: options?.force });
    } catch (e) {
      wrapDockerError(e);
    }
  }

  /**
   * Tire une référence d’image (ex. `nginx:alpine`). La promesse se résout quand le tirage est terminé.
   */
  async pullImage(imageRef: string): Promise<void> {
    if (!imageRef?.trim()) {
      throw new ContainerEngineError(
        "INVALID_SPEC",
        "Une référence d’image est obligatoire.",
      );
    }
    await executerTirageImageDocker(this.docker, imageRef.trim());
  }

  /**
   * Retourne les journaux concaténés (stdout et stderr) pour une réponse JSON ponctuelle.
   */
  async getLogs(
    id: string,
    options?: { tail?: number; timestamps?: boolean },
  ): Promise<string> {
    return lireJournauxConteneur(this.docker, id, options);
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
