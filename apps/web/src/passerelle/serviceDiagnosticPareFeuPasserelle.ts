import { appelerPasserelle } from "../lab/passerelleClient.js";

/**
 * Vue panel de l’état du pare-feu hôte tel que vu par le moteur (firewalld / UFW).
 *
 * - **`automatisationActivee`** : `null` si la passerelle ne joint pas le moteur ;
 *   `true` si l’ouverture automatique des ports est en place, `false` si désactivée par variable d’env.
 * - **`backendChoisi`** : `"firewalld"`, `"ufw"`, ou `null` si aucun backend actif ou si moteur injoignable.
 * - **`messageDiagnostic`** : message court francophone à afficher en bandeau (vide si situation nominale).
 */
/** Normalise le bloc `details` JSON du diagnostic pare-feu en enregistrement chaîne / chaîne. */
function detailsPareFeuVersEnregistrement(
  details: unknown,
): Record<string, string> | undefined {
  if (typeof details !== "object" || details === null || Array.isArray(details)) {
    return undefined;
  }
  const paires: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(details)) {
    paires[cle] = typeof valeur === "string" ? valeur : String(valeur);
  }
  return Object.keys(paires).length > 0 ? paires : undefined;
}

export type DiagnosticPareFeuPanel = {
  automatisationActivee: boolean | null;
  backendChoisi: "firewalld" | "ufw" | null;
  processusEstRoot: boolean;
  sansSudoForce: boolean;
  messageDiagnostic: string;
  details?: Record<string, string>;
};

/** Charge l’état pare-feu hôte vu par le moteur (relais authentifié `GET /panel/pare-feu/diagnostic`). */
export async function chargerDiagnosticPareFeuPasserelle(): Promise<DiagnosticPareFeuPanel | null> {
  try {
    const reponse = await appelerPasserelle("/panel/pare-feu/diagnostic", {
      method: "GET",
    });
    if (!reponse.ok) {
      return null;
    }
    const brut = (await reponse.json()) as unknown;
    if (typeof brut !== "object" || brut === null) {
      return null;
    }
    const c = brut as Partial<DiagnosticPareFeuPanel>;
    return {
      automatisationActivee:
        typeof c.automatisationActivee === "boolean"
          ? c.automatisationActivee
          : null,
      backendChoisi:
        c.backendChoisi === "firewalld" || c.backendChoisi === "ufw"
          ? c.backendChoisi
          : null,
      processusEstRoot: c.processusEstRoot === true,
      sansSudoForce: c.sansSudoForce === true,
      messageDiagnostic:
        typeof c.messageDiagnostic === "string" ? c.messageDiagnostic : "",
      details: detailsPareFeuVersEnregistrement(c.details),
    };
  } catch {
    return null;
  }
}
