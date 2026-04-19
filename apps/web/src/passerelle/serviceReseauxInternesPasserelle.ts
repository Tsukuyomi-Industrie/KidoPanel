import { formaterErreurReseauFetch } from "../lab/passerelleErreursAffichageLab.js";
import { lireJetonPasserelle } from "./jetonPasserelleStockage.js";
import { urlBasePasserelle } from "./url-base-passerelle.js";

export type EnregistrementReseauInternePasserelle = {
  id: string;
  nomAffichage: string;
  nomDocker: string;
  sousReseauCidr: string;
  passerelleIpv4: string;
  sansRouteVersInternetExterne: boolean;
};

/** Liste les ponts créés par l’utilisateur (`GET /reseaux-internes`). */
export async function listerReseauxInternesPasserelle(): Promise<
  EnregistrementReseauInternePasserelle[]
> {
  const jeton = lireJetonPasserelle().trim();
  if (!jeton) {
    throw new Error("Jeton d’accès absent : reconnectez-vous au panel.");
  }
  const base = urlBasePasserelle().replace(/\/$/, "");
  const url = `${base}/reseaux-internes`;
  try {
    const reponse = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${jeton}`,
      },
    });
    const json = (await reponse.json()) as unknown;
    if (!reponse.ok) {
      throw new Error(
        typeof json === "object" &&
          json !== null &&
          "error" in json &&
          typeof (json as { error?: { message?: unknown } }).error?.message === "string"
          ? (json as { error: { message: string } }).error.message
          : `Erreur HTTP ${String(reponse.status)}`,
      );
    }
    if (
      typeof json !== "object" ||
      json === null ||
      !("reseauxInternes" in json) ||
      !Array.isArray((json as { reseauxInternes: unknown }).reseauxInternes)
    ) {
      throw new Error("Réponse liste réseaux illisible.");
    }
    return (json as { reseauxInternes: EnregistrementReseauInternePasserelle[] })
      .reseauxInternes;
  } catch (erreur) {
    throw new Error(formaterErreurReseauFetch(url, erreur));
  }
}

export type CorpsCreationReseauInternePasserelle = {
  nomAffichage: string;
  sousReseauCidr: string;
  sansRouteVersInternetExterne?: boolean;
};

function assemblerUrlReseaux(idOptionnel?: string): string {
  const base = urlBasePasserelle().replace(/\/$/, "");
  if (idOptionnel === undefined || idOptionnel.length === 0) {
    return `${base}/reseaux-internes`;
  }
  return `${base}/reseaux-internes/${encodeURIComponent(idOptionnel)}`;
}

async function fetchJsonReseaux(url: string, init: RequestInit): Promise<Response> {
  const jeton = lireJetonPasserelle().trim();
  if (!jeton) {
    throw new Error("Jeton d’accès absent : reconnectez-vous au panel.");
  }
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
  } catch (erreur) {
    throw new Error(formaterErreurReseauFetch(url, erreur));
  }
}

/** Crée un pont utilisateur (`POST /reseaux-internes`). */
export async function creerReseauInternePasserelle(
  corps: CorpsCreationReseauInternePasserelle,
): Promise<EnregistrementReseauInternePasserelle> {
  const reponse = await fetchJsonReseaux(assemblerUrlReseaux(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  const texteBrut = await reponse.text();
  let json: unknown;
  try {
    json = texteBrut.length === 0 ? null : JSON.parse(texteBrut);
  } catch {
    throw new Error(
      `Réponse passerelle illisible (HTTP ${String(reponse.status)}) : ${texteBrut.slice(0, 480)}`,
    );
  }
  if (!reponse.ok) {
    const msg =
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof (json as { error?: { message?: unknown } }).error?.message === "string"
        ? (json as { error: { message: string } }).error.message
        : `Erreur HTTP ${String(reponse.status)}`;
    throw new Error(msg);
  }
  if (
    typeof json !== "object" ||
    json === null ||
    !("reseauInterne" in json)
  ) {
    throw new Error(
      `Réponse création réseau inattendue : ${texteBrut.slice(0, 480)}`,
    );
  }
  return (json as { reseauInterne: EnregistrementReseauInternePasserelle }).reseauInterne;
}

/** Supprime un réseau sans instance rattachée. */
export async function supprimerReseauInternePasserelle(idReseau: string): Promise<void> {
  const reponse = await fetchJsonReseaux(assemblerUrlReseaux(idReseau), {
    method: "DELETE",
  });
  if (!reponse.ok) {
    const json = (await reponse.json().catch(() => null)) as unknown;
    const msg =
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof (json as { error?: { message?: unknown } }).error?.message === "string"
        ? (json as { error: { message: string } }).error.message
        : `Erreur HTTP ${String(reponse.status)}`;
    throw new Error(msg);
  }
}
