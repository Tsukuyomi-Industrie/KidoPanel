import { formaterErreurReseauFetch } from "../lab/passerelleErreursAffichageLab.js";
import { urlBasePasserelle } from "./url-base-passerelle.js";

export type UtilisateurPublicPasserelle = {
  id: string;
  email: string;
};

export type ResultatConnexionPasserelle = {
  jeton: string;
  utilisateur: UtilisateurPublicPasserelle;
};

function assemblerUrl(cheminRelatif: string): string {
  const base = urlBasePasserelle().replace(/\/$/, "");
  const chemin = cheminRelatif.startsWith("/") ? cheminRelatif : `/${cheminRelatif}`;
  return `${base}${chemin}`;
}

function extraireMessageErreurJson(corps: unknown): string | null {
  if (
    typeof corps === "object" &&
    corps !== null &&
    "error" in corps &&
    typeof (corps as { error?: unknown }).error === "object" &&
    (corps as { error: { message?: unknown } }).error !== null
  ) {
    const msg = (corps as { error: { message?: unknown } }).error.message;
    return typeof msg === "string" && msg.trim() !== "" ? msg : null;
  }
  return null;
}

async function lireCorpsJson(reponse: Response): Promise<unknown> {
  const texte = await reponse.text();
  if (texte.trim() === "") {
    return null;
  }
  try {
    return JSON.parse(texte) as unknown;
  } catch {
    return { brut: texte };
  }
}

/**
 * Envoie une inscription à la passerelle et renvoie le jeton si la réponse est valide.
 */
export async function inscrireViaPasserelle(
  email: string,
  motDePasse: string,
): Promise<ResultatConnexionPasserelle> {
  const url = assemblerUrl("/auth/register");
  let reponse: Response;
  try {
    reponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password: motDePasse }),
      mode: "cors",
      cache: "no-store",
    });
  } catch (error_) {
    throw new Error(formaterErreurReseauFetch(url, error_));
  }
  const json = await lireCorpsJson(reponse);
  if (!reponse.ok) {
    const detail = extraireMessageErreurJson(json);
    throw new Error(
      detail ??
        `L’inscription a échoué (code HTTP ${String(reponse.status)}).`,
    );
  }
  if (
    typeof json !== "object" ||
    json === null ||
    typeof (json as { token?: unknown }).token !== "string" ||
    typeof (json as { user?: unknown }).user !== "object" ||
    (json as { user?: unknown }).user === null
  ) {
    throw new Error("Réponse d’inscription inattendue de la passerelle.");
  }
  const u = (json as { user: { id?: unknown; email?: unknown } }).user;
  if (typeof u.id !== "string" || typeof u.email !== "string") {
    throw new Error("Profil utilisateur incomplet dans la réponse d’inscription.");
  }
  return {
    jeton: (json as { token: string }).token,
    utilisateur: { id: u.id, email: u.email },
  };
}

/**
 * Envoie une connexion à la passerelle et renvoie le jeton si les identifiants sont acceptés.
 */
export async function connecterViaPasserelle(
  email: string,
  motDePasse: string,
): Promise<ResultatConnexionPasserelle> {
  const url = assemblerUrl("/auth/login");
  let reponse: Response;
  try {
    reponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password: motDePasse }),
      mode: "cors",
      cache: "no-store",
    });
  } catch (error_) {
    throw new Error(formaterErreurReseauFetch(url, error_));
  }
  const json = await lireCorpsJson(reponse);
  if (!reponse.ok) {
    const detail = extraireMessageErreurJson(json);
    throw new Error(
      detail ??
        `La connexion a échoué (code HTTP ${String(reponse.status)}).`,
    );
  }
  if (
    typeof json !== "object" ||
    json === null ||
    typeof (json as { token?: unknown }).token !== "string" ||
    typeof (json as { user?: unknown }).user !== "object" ||
    (json as { user?: unknown }).user === null
  ) {
    throw new Error("Réponse de connexion inattendue de la passerelle.");
  }
  const u = (json as { user: { id?: unknown; email?: unknown } }).user;
  if (typeof u.id !== "string" || typeof u.email !== "string") {
    throw new Error("Profil utilisateur incomplet dans la réponse de connexion.");
  }
  return {
    jeton: (json as { token: string }).token,
    utilisateur: { id: u.id, email: u.email },
  };
}
