import type {
  ContainerCreateOptions,
  ContainerInspectInfo,
  ContainerInfo,
  HostConfig,
  PortBinding as DockerPortBinding,
} from "dockerode";
import {
  type CreateContainerResult,
  type ContainerCreateSpec,
  type ContainerHostConfig,
  type ContainerStatus,
  type ContainerSummary,
} from "./types.js";
import { ContainerEngineError } from "./errors.js";
import {
  createDockerClient,
  type DockerClient,
  type DockerConnectionOptions,
} from "./docker-connection.js";

/** Construit le champ Docker `ExposedPorts` à partir d’une liste de ports (`"80/tcp"`). */
function mapExposedPorts(
  ports: string[] | undefined,
): Record<string, object> | undefined {
  if (!ports?.length) return undefined;
  const out: Record<string, object> = {};
  for (const p of ports) {
    out[p] = {};
  }
  return out;
}

/** Traduit les liaisons métier vers le format `PortBindings` de l’API Docker. */
function mapPortBindings(
  bindings: ContainerHostConfig["portBindings"],
): Record<string, DockerPortBinding[]> | undefined {
  if (!bindings) return undefined;
  const out: Record<string, DockerPortBinding[]> = {};
  for (const [containerPort, list] of Object.entries(bindings)) {
    out[containerPort] = list.map((b) => ({
      HostIp: b.hostIp ?? "",
      HostPort: b.hostPort,
    }));
  }
  return out;
}

/** Projette la configuration hôte métier sur un `HostConfig` Docker. */
function mapHostConfig(
  host?: ContainerHostConfig,
): HostConfig | undefined {
  if (!host) return undefined;
  return {
    Memory: host.memoryBytes,
    NanoCpus: host.nanoCpus,
    PortBindings: mapPortBindings(host.portBindings),
    AutoRemove: host.autoRemove,
    Binds: host.binds,
  };
}

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

/** Indique si l’erreur porte un code système Node (`errno`). */
function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}

/**
 * Rejette toujours : convertit les erreurs Docker ou réseau en `ContainerEngineError` typées.
 */
function wrapDockerError(err: unknown): never {
  if (isErrnoException(err)) {
    if (
      err.code === "ECONNREFUSED" ||
      err.code === "ENOENT" ||
      err.code === "ENOTFOUND"
    ) {
      throw new ContainerEngineError(
        "DOCKER_UNAVAILABLE",
        "Impossible de joindre Docker Engine (vérifier DOCKER_HOST et les droits sur le socket).",
        { cause: err },
      );
    }
  }
  if (err && typeof err === "object" && "statusCode" in err) {
    const sc = (err as { statusCode?: number }).statusCode;
    const msg = err instanceof Error ? err.message : String(err);
    if (sc === 404) {
      throw new ContainerEngineError("NOT_FOUND", msg, { cause: err });
    }
    if (sc === 409) {
      throw new ContainerEngineError("CONFLICT", msg, { cause: err });
    }
  }
  const msg = err instanceof Error ? err.message : String(err);
  throw new ContainerEngineError("OPERATION_FAILED", msg, { cause: err });
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

  constructor(options?: ContainerEngineOptions) {
    if (options?.docker) {
      this.docker = options.docker;
    } else {
      this.docker = createDockerClient(options?.connection);
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

    const env = spec.env
      ? Object.entries(spec.env).map(([k, v]) => `${k}=${v}`)
      : undefined;

    const opts: ContainerCreateOptions = {
      name: spec.name,
      Image: spec.image,
      Cmd: spec.cmd,
      Env: env,
      Labels: spec.labels,
      ExposedPorts: mapExposedPorts(spec.exposedPorts),
      HostConfig: mapHostConfig(spec.hostConfig),
      OpenStdin: spec.openStdin,
      Tty: spec.tty,
    };

    try {
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
    try {
      await new Promise<void>((resolve, reject) => {
        this.docker.pull(
          imageRef,
          (err: Error | null, stream: NodeJS.ReadableStream | undefined) => {
            if (err) {
              reject(err);
              return;
            }
            if (!stream) {
              reject(new Error("tirage d’image : flux de réponse vide"));
              return;
            }
            this.docker.modem.followProgress(
              stream,
              (followErr: Error | null | undefined) => {
                if (followErr) reject(followErr);
                else resolve();
              },
            );
          },
        );
      });
    } catch (e) {
      wrapDockerError(e);
    }
  }

  /**
   * Retourne les journaux concaténés (stdout et stderr). Pour du flux continu, utiliser le client `raw` plus tard.
   */
  async getLogs(
    id: string,
    options?: { tail?: number; timestamps?: boolean },
  ): Promise<string> {
    try {
      const container = this.docker.getContainer(id);
      const buf = await container.logs({
        stdout: true,
        stderr: true,
        timestamps: options?.timestamps,
        tail: options?.tail,
      });
      return Buffer.isBuffer(buf) ? buf.toString("utf8") : String(buf);
    } catch (e) {
      wrapDockerError(e);
    }
  }

  /** Accès bas niveau au client Docker pour les cas avancés. */
  get raw(): DockerClient {
    return this.docker;
  }
}
