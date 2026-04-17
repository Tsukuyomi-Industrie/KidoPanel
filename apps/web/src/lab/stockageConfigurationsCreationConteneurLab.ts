import type { ConfigurationCreationConteneurSauvegardee } from "./typesConfigurationCreationConteneurLab.js";

const CLE_STOCKAGE_NAVIGATEUR =
  "kidopanel_lab_configurations_creation_conteneur_v1";

/** Indique si le stockage local du navigateur est utilisable. */
export function stockageLocalDisponible(): boolean {
  try {
    return typeof globalThis.localStorage !== "undefined";
  } catch {
    return false;
  }
}

/** Lit la liste des configurations enregistrées (tableau vide si absent ou invalide). */
export function lireConfigurationsCreationConteneurLab(): ConfigurationCreationConteneurSauvegardee[] {
  if (!stockageLocalDisponible()) {
    return [];
  }
  try {
    const brut = globalThis.localStorage.getItem(CLE_STOCKAGE_NAVIGATEUR);
    if (brut === null || brut.length === 0) {
      return [];
    }
    const parse = JSON.parse(brut) as unknown;
    if (!Array.isArray(parse)) {
      return [];
    }
    const sortie: ConfigurationCreationConteneurSauvegardee[] = [];
    for (const entree of parse) {
      if (
        entree === null ||
        typeof entree !== "object" ||
        Array.isArray(entree) ||
        typeof (entree as { id?: unknown }).id !== "string" ||
        typeof (entree as { nom?: unknown }).nom !== "string" ||
        typeof (entree as { corps?: unknown }).corps !== "object" ||
        (entree as { corps?: unknown }).corps === null ||
        Array.isArray((entree as { corps: unknown }).corps)
      ) {
        continue;
      }
      const { id, nom, corps } = entree as ConfigurationCreationConteneurSauvegardee;
      sortie.push({
        id,
        nom: String(nom).trim() || "Sans nom",
        corps: corps as Record<string, unknown>,
      });
    }
    return sortie;
  } catch {
    return [];
  }
}

/** Persiste la liste complète des configurations (écrase la valeur précédente). */
export function ecrireConfigurationsCreationConteneurLab(
  liste: ConfigurationCreationConteneurSauvegardee[],
): void {
  if (!stockageLocalDisponible()) {
    throw new Error("Le stockage local du navigateur n’est pas disponible.");
  }
  globalThis.localStorage.setItem(
    CLE_STOCKAGE_NAVIGATEUR,
    JSON.stringify(liste),
  );
}

/** Génère un identifiant unique pour une nouvelle configuration. */
export function genererIdConfigurationCreationConteneurLab(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
    return cryptoRef.randomUUID();
  }
  return `cfg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
