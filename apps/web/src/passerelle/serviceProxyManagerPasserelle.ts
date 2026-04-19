import { formaterErreurReseauFetch } from "../lab/passerelleErreursAffichageLab.js";
import { lireJetonPasserelle } from "./jetonPasserelleStockage.js";
import { urlBasePasserelle } from "./url-base-passerelle.js";

export type DomaineProxyPasserelle = {
  id: string;
  domaine: string;
  webInstanceId: string | null;
  cibleInterne: string;
  portCible: number;
  sslActif: boolean;
  creeLe: string;
};

export type CorpsAjoutDomaine = {
  domaine: string;
  webInstanceId: string;
  portCible: number;
};

function assemblerUrl(cheminRelatif: string): string {
  const base = urlBasePasserelle().replace(/\/$/, "");
  const chemin = cheminRelatif.startsWith("/") ? cheminRelatif : `/${cheminRelatif}`;
  return `${base}${chemin}`;
}

async function appelerAuthentifie(
  chemin: string,
  init: RequestInit,
): Promise<Response> {
  const jeton = lireJetonPasserelle().trim();
  if (!jeton) {
    throw new Error("Jeton d’accès absent : reconnectez-vous au panel.");
  }
  const url = assemblerUrl(chemin);
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

function messageErreurHttp(reponse: Response, json: unknown): string {
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

export async function listerDomainesProxyPasserelle(): Promise<DomaineProxyPasserelle[]> {
  const reponse = await appelerAuthentifie("/proxy/domaines", { method: "GET" });
  const json = (await reponse.json()) as unknown;
  if (!reponse.ok) {
    throw new Error(messageErreurHttp(reponse, json));
  }
  if (
    typeof json !== "object" ||
    json === null ||
    !("domaines" in json) ||
    !Array.isArray((json as { domaines: unknown }).domaines)
  ) {
    throw new Error("Réponse liste domaines illisible.");
  }
  return (json as { domaines: DomaineProxyPasserelle[] }).domaines;
}

export async function ajouterDomaineProxyPasserelle(
  corps: CorpsAjoutDomaine,
): Promise<DomaineProxyPasserelle> {
  const reponse = await appelerAuthentifie("/proxy/domaines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  const json = (await reponse.json()) as unknown;
  if (!reponse.ok) {
    throw new Error(messageErreurHttp(reponse, json));
  }
  return json as DomaineProxyPasserelle;
}

export async function supprimerDomaineProxyPasserelle(id: string): Promise<void> {
  const reponse = await appelerAuthentifie(
    `/proxy/domaines/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (!reponse.ok) {
    const json = (await reponse.json().catch(() => null)) as unknown;
    throw new Error(messageErreurHttp(reponse, json));
  }
}

export async function rechargerProxyPasserelle(): Promise<void> {
  const reponse = await appelerAuthentifie("/proxy/reload", { method: "POST" });
  if (!reponse.ok) {
    const json = (await reponse.json().catch(() => null)) as unknown;
    throw new Error(messageErreurHttp(reponse, json));
  }
}
