import type { Readable } from "node:stream";
import type { DockerClient } from "./docker-connection.js";
import { DockerLogFrameDemuxStream } from "./docker/docker-log-frame-demux.js";
import { wrapDockerError } from "./docker/wrap-docker-operation.js";
import { ContainerEngineError } from "./errors.js";

/**
 * Lecture ponctuelle des journaux (stdout et stderr concaténés), pour les routes JSON existantes.
 */
export async function lireJournauxConteneur(
  docker: DockerClient,
  id: string,
  options?: { tail?: number; timestamps?: boolean; since?: number },
): Promise<string> {
  try {
    const container = docker.getContainer(id);
    const buf = await container.logs({
      stdout: true,
      stderr: true,
      timestamps: options?.timestamps,
      tail: options?.tail,
      since: options?.since,
    });
    return Buffer.isBuffer(buf) ? buf.toString("utf8") : String(buf);
  } catch (e) {
    wrapDockerError(e);
  }
}

export type FluxSuiviJournaux = {
  /** Flux UTF-8 binaire (lignes non normalisées : le routeur SSE découpe les retours ligne). */
  readable: Readable;
  /** Coupe le flux côté Docker et pipelines associés. */
  fermer: () => void;
};

/**
 * Ouvre un flux Docker `follow` avec démultiplexage si le conteneur n’est pas en mode TTY.
 */
export async function ouvrirFluxSuiviJournaux(
  docker: DockerClient,
  containerId: string,
  options?: { tail?: number; timestamps?: boolean; since?: number },
): Promise<FluxSuiviJournaux> {
  const container = docker.getContainer(containerId);
  let tty = false;
  try {
    const inspection = await container.inspect();
    tty = Boolean(inspection.Config?.Tty);
  } catch (e) {
    wrapDockerError(e);
  }

  let brut: Readable;
  try {
    const resultat = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      timestamps: options?.timestamps ?? false,
      tail: options?.tail,
      since: options?.since,
    });
    if (Buffer.isBuffer(resultat)) {
      throw new ContainerEngineError(
        "OPERATION_FAILED",
        "Réponse de journaux instantanée inattendue pour un suivi continu.",
      );
    }
    brut = resultat as Readable;
  } catch (e) {
    wrapDockerError(e);
  }

  if (tty) {
    const fermer = (): void => {
      brut.destroy();
    };
    return { readable: brut, fermer };
  }

  const demux = new DockerLogFrameDemuxStream();
  const fermer = (): void => {
    brut.unpipe(demux);
    brut.destroy();
    demux.destroy();
  };
  brut.on("error", (err: Error) => {
    demux.destroy(err);
  });
  brut.pipe(demux);
  return { readable: demux, fermer };
}
