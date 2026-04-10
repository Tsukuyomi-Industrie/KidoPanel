import type { ContainerOwnershipRepository } from "./container-ownership-repository.prisma.js";
import { estConteneurPossede } from "./docker-identifiant-conteneur.js";

/**
 * Point d’entrée unique côté passerelle pour savoir si un utilisateur peut agir sur un conteneur donné (interrogation Prisma via le dépôt).
 */
export async function verifyContainerOwnership(
  depot: ContainerOwnershipRepository,
  userId: string,
  containerId: string,
): Promise<boolean> {
  return depot.userOwnsContainer(userId, containerId);
}

/**
 * Filtre la liste renvoyée par le moteur : ne conserve que les entrées dont l’identifiant correspond à une propriété enregistrée pour l’utilisateur (une requête liste côté dépôt, cohérente avec verifyContainerOwnership).
 */
export async function filtrerConteneursParProprieteUtilisateur<
  T extends { id: string },
>(
  depot: ContainerOwnershipRepository,
  userId: string,
  conteneurs: T[],
): Promise<T[]> {
  const idsPossedes = await depot.getContainerIdsByUser(userId);
  return conteneurs.filter((cont) =>
    estConteneurPossede(idsPossedes, cont.id),
  );
}
