import type { DockerClient } from "../docker-connection.js";
import { ContainerEngineError } from "../errors.js";

/** Détecte une erreur système Node portant un code `errno`. */
function estErreurErrno(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}

/**
 * Interprète une erreur de connexion au démon Docker (socket, réseau) en erreur métier.
 * Retourne `null` si l’erreur ne correspond pas à ce cas.
 */
function erreurConnexionDockerSiApplicable(
  err: unknown,
): ContainerEngineError | null {
  if (!estErreurErrno(err)) return null;
  if (
    err.code === "ECONNREFUSED" ||
    err.code === "ENOENT" ||
    err.code === "ENOTFOUND"
  ) {
    return new ContainerEngineError(
      "DOCKER_UNAVAILABLE",
      "Impossible de joindre Docker Engine (vérifier DOCKER_HOST et les droits sur le socket).",
      { cause: err },
    );
  }
  return null;
}

/** Extrait un code HTTP éventuellement présent sur les erreurs renvoyées par dockerode. */
function statutHttpDocker(err: unknown): number | undefined {
  if (err && typeof err === "object" && "statusCode" in err) {
    const sc = (err as { statusCode?: number }).statusCode;
    return typeof sc === "number" ? sc : undefined;
  }
  return undefined;
}

/**
 * Exécute un tirage d’image jusqu’à la fin du flux Docker et mappe les échecs vers des codes métier
 * sans reprendre le texte brut du démon dans le message client.
 */
export async function executerTirageImageDocker(
  docker: DockerClient,
  imageRef: string,
): Promise<void> {
  try {
    await new Promise<void>((resolve, reject) => {
      docker.pull(
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
          docker.modem.followProgress(
            stream,
            (followErr: Error | null | undefined) => {
              if (followErr) reject(followErr);
              else resolve();
            },
          );
        },
      );
    });
  } catch (error_) {
    const connexion = erreurConnexionDockerSiApplicable(error_);
    if (connexion) throw connexion;
    const sc = statutHttpDocker(error_);
    if (sc === 404) {
      throw new ContainerEngineError(
        "IMAGE_NOT_FOUND",
        `Aucune image ne correspond à la référence « ${imageRef} » sur le registre.`,
        { cause: error_ },
      );
    }
    throw new ContainerEngineError(
      "IMAGE_PULL_FAILED",
      `Impossible de récupérer l'image ${imageRef}`,
      { cause: error_ },
    );
  }
}

