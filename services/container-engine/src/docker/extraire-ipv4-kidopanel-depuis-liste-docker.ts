import type { ContainerInfo } from "dockerode";
import { NOM_RESEAU_BRIDGE_INTERNE_KIDOPANEL } from "./reseau-interne-kidopanel.constantes.js";

/**
 * Lit l’IPv4 du conteneur sur le réseau partagé KidoPanel depuis une entrée de `docker ps` / `listContainers`.
 * Diffère de l’adresse publiée dans `Ports[]` (IP d’écoute hôte pour les mappings).
 */
export function extraireIpv4KidopanelDepuisEntreeListeDocker(
  entree: ContainerInfo,
): string | undefined {
  const plage = (
    entree as {
      NetworkSettings?: { Networks?: Record<string, { IPAddress?: string }> };
    }
  ).NetworkSettings?.Networks;
  if (plage === undefined || typeof plage !== "object") {
    return undefined;
  }
  const attachement = plage[NOM_RESEAU_BRIDGE_INTERNE_KIDOPANEL];
  const ip = attachement?.IPAddress;
  if (typeof ip !== "string") {
    return undefined;
  }
  const normalise = ip.trim();
  return normalise.length > 0 ? normalise : undefined;
}
