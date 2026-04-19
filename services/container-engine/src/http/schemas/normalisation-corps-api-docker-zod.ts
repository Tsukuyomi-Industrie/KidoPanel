/**
 * Normalisations pour la validation Zod du corps `POST /containers` : formes collées depuis l’API Docker,
 * fusion « modèle complet » avec `null`, ou objets `exposedPorts` / `LogConfig` au format moteur.
 */

/**
 * Accepte le tableau métier ou l’objet style API Docker (`{ "80/tcp": {} }`), et supprime `null`.
 */
export function normaliserExposedPortsPourValidationZod(entree: unknown): unknown {
  if (entree === null || entree === undefined) {
    return undefined;
  }
  if (Array.isArray(entree)) {
    return entree;
  }
  if (typeof entree === "object" && entree !== null) {
    return Object.keys(entree as Record<string, unknown>).filter((k) => k.trim().length > 0);
  }
  return entree;
}

/** Convertit un bloc configuration Docker brut en tableau de paires chaîne pour le schéma métier LogConfig. */
function pairesConfigurationPourLogDocker(configurationBrute: unknown): Record<string, string> | undefined {
  if (
    configurationBrute === undefined ||
    typeof configurationBrute !== "object" ||
    configurationBrute === null ||
    Array.isArray(configurationBrute)
  ) {
    return undefined;
  }
  const paires: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(configurationBrute as Record<string, unknown>)) {
    paires[cle] = typeof valeur === "string" ? valeur : String(valeur);
  }
  return Object.keys(paires).length > 0 ? paires : undefined;
}

/**
 * Supprime les objets vides sans pilote, normalise `Type` / `Config` vers `type` / `config` attendus par le schéma métier.
 */
export function normaliserLogConfigHostPourValidationZod(entree: unknown): unknown {
  if (entree === null || entree === undefined) {
    return undefined;
  }
  if (
    typeof entree === "object" &&
    entree !== null &&
    Array.isArray(entree) === false
  ) {
    const enregistrement = entree as Record<string, unknown>;
    let typeEffectif: string | undefined;
    if (
      typeof enregistrement.type === "string" &&
      enregistrement.type.trim().length > 0
    ) {
      typeEffectif = enregistrement.type.trim();
    } else if (
      typeof enregistrement.Type === "string" &&
      (enregistrement.Type as string).trim().length > 0
    ) {
      typeEffectif = (enregistrement.Type as string).trim();
    }
    if (typeEffectif === undefined) {
      return undefined;
    }
    const configurationBrute =
      enregistrement.config !== undefined ? enregistrement.config : enregistrement.Config;
    const sortie: { type: string; config?: Record<string, string> } = {
      type: typeEffectif,
    };
    const pairesNormalisees = pairesConfigurationPourLogDocker(configurationBrute);
    if (pairesNormalisees !== undefined) {
      sortie.config = pairesNormalisees;
    }
    return sortie;
  }
  return entree;
}
