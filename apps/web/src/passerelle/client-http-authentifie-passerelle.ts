import { formaterErreurReseauFetch } from "../lab/passerelleErreursAffichageLab.js";
import { lireJetonPasserelle } from "./jetonPasserelleStockage.js";
import { urlBasePasserelle } from "./url-base-passerelle.js";

/** Construit une URL absolue passerelle à partir d’un chemin relatif. */
export function assemblerUrlPasserelle(cheminRelatif: string): string {
  const base = urlBasePasserelle().replace(/\/$/, "");
  const chemin = cheminRelatif.startsWith("/") ? cheminRelatif : `/${cheminRelatif}`;
  return `${base}${chemin}`;
}

/** Extrait un message d’erreur HTTP standard depuis un corps JSON passerelle. */
export function messageErreurHttpDepuisJson(reponse: Response, json: unknown): string {
  if (
    typeof json === "object" &&
    json !== null &&
    "error" in json &&
    typeof (json as { error?: { message?: unknown } }).error?.message === "string"
  ) {
    return (json as { error: { message: string } }).error.message;
  }
  return `Erreur HTTP ${String(reponse.status)}`;
}

/** Convertit une réponse HTTP JSON en objet ou `null` si le corps est vide/invalide. */
export async function lireJsonReponseOuNull(reponse: Response): Promise<unknown> {
  try {
    return (await reponse.json()) as unknown;
  } catch {
    return null;
  }
}

/** Exécute un `fetch` authentifié vers la passerelle avec en-têtes JSON standards. */
export async function appelerJsonAuthentifiePasserelle(
  chemin: string,
  init: RequestInit,
): Promise<Response> {
  const jeton = lireJetonPasserelle().trim();
  if (!jeton) {
    throw new Error("Jeton d’accès absent : reconnectez-vous au panel.");
  }
  const url = assemblerUrlPasserelle(chemin);
  try {
    return await fetch(url, {
      ...init,
      mode: "cors",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${jeton}`,
        ...init.headers,
      },
    });
  } catch (error_) {
    throw new Error(formaterErreurReseauFetch(url, error_));
  }
}
