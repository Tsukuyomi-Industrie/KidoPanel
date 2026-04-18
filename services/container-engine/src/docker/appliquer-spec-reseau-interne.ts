import type { ContainerCreateSpec } from "../types.js";
import { NOM_RESEAU_BRIDGE_INTERNE_KIDOPANEL } from "./reseau-interne-kidopanel.constantes.js";

/**
 * Indique si le mode réseau explicite doit être préservé (réseaux hôte, absent ou partagé avec un autre conteneur).
 */
function doitPreserverModeReseauUtilisateur(networkMode: string | undefined): boolean {
  if (networkMode === undefined || networkMode.trim().length === 0) {
    return false;
  }
  const v = networkMode.trim();
  if (v === "host" || v === "none") {
    return true;
  }
  if (v.startsWith("container:")) {
    return true;
  }
  return false;
}

/**
 * Force l’attachement au réseau interne `kidopanel-network`, à un pont utilisateur, ou au primaire en mode double pont,
 * lorsque la spécification ne désactive pas la pile réseau et ne réserve pas un mode Docker incompatible avec un bridge nommé.
 */
export function appliquerAttachementReseauInterneKidopanelSurSpec(
  spec: ContainerCreateSpec,
): ContainerCreateSpec {
  if (spec.networkDisabled === true) {
    return spec;
  }
  const modeActuel = spec.hostConfig?.networkMode;
  if (doitPreserverModeReseauUtilisateur(modeActuel)) {
    return spec;
  }
  const dual = spec.reseauDualAvecKidopanel === true;
  const pontPersonnalise = spec.reseauBridgeNom?.trim();
  const primaireKido = spec.reseauPrimaireKidopanel !== false;

  if (
    dual &&
    pontPersonnalise !== undefined &&
    pontPersonnalise.length > 0
  ) {
    const modePontPrimaire = primaireKido
      ? NOM_RESEAU_BRIDGE_INTERNE_KIDOPANEL
      : pontPersonnalise;
    return {
      ...spec,
      hostConfig: {
        ...(spec.hostConfig ?? {}),
        networkMode: modePontPrimaire,
      },
    };
  }

  const modePont =
    pontPersonnalise !== undefined && pontPersonnalise.length > 0
      ? pontPersonnalise
      : NOM_RESEAU_BRIDGE_INTERNE_KIDOPANEL;
  return {
    ...spec,
    hostConfig: {
      ...(spec.hostConfig ?? {}),
      networkMode: modePont,
    },
  };
}
