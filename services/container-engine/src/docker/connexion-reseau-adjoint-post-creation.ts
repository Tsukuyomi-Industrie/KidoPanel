import type { DockerClient } from "../docker-connection.js";
import { ContainerEngineError } from "../errors.js";
import { filtreNomReseauDocker } from "./network.service.js";

/**
 * Rattache un conteneur déjà créé à un second réseau bridge (`docker network connect`).
 */
export async function connecterConteneurIdentifiantAuReseauParNomDocker(
  docker: DockerClient,
  idConteneurDocker: string,
  nomReseauDocker: string,
): Promise<void> {
  const nom = nomReseauDocker.trim();
  const liste = await docker.listNetworks({ filters: filtreNomReseauDocker(nom) });
  const trouve = liste.find((n) => n.Name === nom);
  if (trouve?.Id === undefined) {
    throw new ContainerEngineError(
      "INVALID_SPEC",
      `Réseau « ${nom} » introuvable pour la connexion secondaire au conteneur.`,
    );
  }
  const reseau = docker.getNetwork(trouve.Id);
  await reseau.connect({ Container: idConteneurDocker });
}
