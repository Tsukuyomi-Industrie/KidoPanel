import type { DockerClient } from "./docker-connection.js";
import { executerTirageImageDocker } from "./docker/image.service.js";
import { wrapDockerError } from "./docker/wrap-docker-operation.js";
import { isContainerEngineError } from "./errors.js";
import { journaliserMoteur } from "./observabilite/journal-json.js";

/** Détecte un code HTTP 404 sur une erreur dockerode typique. */
function estErreurDocker404(err: unknown): boolean {
  if (err && typeof err === "object" && "statusCode" in err) {
    const sc = (err as { statusCode?: number }).statusCode;
    return sc === 404;
  }
  return false;
}

/** Origine connue pour les journaux lors d’un tirage avant création. */
export type MetaJournalTirageImageCreation =
  | {
      mode: "catalogue";
      idCatalogue: string;
      referenceDocker: string;
    }
  | {
      mode: "libre";
      referenceDocker: string;
    };

/**
 * Contrat du service : garantir localement une référence Docker déjà acceptée par la validation,
 * en déclenchant au plus un tirage depuis le registre pour cette chaîne exacte.
 */
export interface ServiceTirageImageMoteur {
  garantirPresenceImagePourCreation(
    meta: MetaJournalTirageImageCreation,
    requestId: string | undefined,
  ): Promise<void>;
}

async function garantirUneReferenceSurHote(
  docker: DockerClient,
  referenceDocker: string,
  requestId: string | undefined,
  meta: MetaJournalTirageImageCreation,
): Promise<void> {
  try {
    await docker.getImage(referenceDocker).inspect();
    return;
  } catch (error_) {
    if (!estErreurDocker404(error_)) {
      wrapDockerError(error_);
    }
  }

  journaliserMoteur({
    niveau: "info",
    message: "image_pull_start",
    requestId,
    metadata:
      meta.mode === "catalogue"
        ? {
            idCatalogue: meta.idCatalogue,
            referenceDocker,
          }
        : {
            referenceDocker,
            modeImageReferenceLibre: true,
          },
  });

  try {
    await executerTirageImageDocker(docker, referenceDocker);
  } catch (error_) {
    journaliserMoteur({
      niveau: "error",
      message: "image_pull_failed",
      requestId,
      metadata:
        meta.mode === "catalogue"
          ? {
              idCatalogue: meta.idCatalogue,
              referenceDocker,
              codeErreur: isContainerEngineError(error_) ? error_.code : "inconnu",
            }
          : {
              referenceDocker,
              modeImageReferenceLibre: true,
              codeErreur: isContainerEngineError(error_) ? error_.code : "inconnu",
            },
    });
    throw error_;
  }

  journaliserMoteur({
    niveau: "info",
    message: "image_pull_success",
    requestId,
    metadata:
      meta.mode === "catalogue"
        ? {
            idCatalogue: meta.idCatalogue,
            referenceDocker,
          }
        : {
            referenceDocker,
            modeImageReferenceLibre: true,
          },
  });
}

/**
 * Fabrique le service de tirage ; la chaîne utilisée doit provenir exclusivement du catalogue ou
 * du contrôle {@link analyserReferenceDockerLibre}, jamais d’une entrée brute utilisateur sans validation.
 */
export function creerServiceTirageImageMoteur(
  docker: DockerClient,
): ServiceTirageImageMoteur {
  return {
    async garantirPresenceImagePourCreation(meta, requestId) {
      await garantirUneReferenceSurHote(docker, meta.referenceDocker, requestId, meta);
    },
  };
}
