import { formaterErreurReseauFetch } from "../lab/passerelleErreursAffichageLab.js";
import { lireJetonPasserelle } from "./jetonPasserelleStockage.js";
import { urlBasePasserelle } from "./url-base-passerelle.js";

export type DomaineLieWebPasserelle = {
  id: string;
  domaine: string;
  sslActif: boolean;
  portCible: number;
};

export type WebInstancePasserelle = {
  id: string;
  userId: string;
  name: string;
  techStack: string;
  status: string;
  containerId: string | null;
  memoryMb: number;
  diskGb: number;
  domain: string | null;
  env?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
  domaines?: DomaineLieWebPasserelle[];
  reseauInterneUtilisateurId?: string | null;
};

export type CorpsCreationWebInstance = {
  name: string;
  techStack: string;
  memoryMb: number;
  diskGb: number;
  env?: Record<string, string>;
  portHote?: number;
  domaineInitial?: string;
  gabaritDockerRapideId?: string;
  reseauInterneUtilisateurId?: string;
};

function assemblerUrl(cheminRelatif: string): string {
  const base = urlBasePasserelle().replace(/\/$/, "");
  const chemin = cheminRelatif.startsWith("/") ? cheminRelatif : `/${cheminRelatif}`;
  return `${base}${chemin}`;
}

async function appelerJsonAuthentifie(
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

export async function listerWebInstancesPasserelle(): Promise<WebInstancePasserelle[]> {
  const reponse = await appelerJsonAuthentifie("/web-instances", { method: "GET" });
  const json = (await reponse.json()) as unknown;
  if (!reponse.ok) {
    throw new Error(messageErreurHttp(reponse, json));
  }
  if (
    typeof json !== "object" ||
    json === null ||
    !("instances" in json) ||
    !Array.isArray((json as { instances: unknown }).instances)
  ) {
    throw new Error("Réponse liste instances web illisible.");
  }
  return (json as { instances: WebInstancePasserelle[] }).instances;
}

export async function obtenirWebInstancePasserelle(id: string): Promise<WebInstancePasserelle> {
  const reponse = await appelerJsonAuthentifie(
    `/web-instances/${encodeURIComponent(id)}`,
    { method: "GET" },
  );
  const json = (await reponse.json()) as unknown;
  if (!reponse.ok) {
    throw new Error(messageErreurHttp(reponse, json));
  }
  return json as WebInstancePasserelle;
}

export async function creerWebInstancePasserelle(
  corps: CorpsCreationWebInstance,
): Promise<WebInstancePasserelle> {
  const reponse = await appelerJsonAuthentifie("/web-instances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  const json = (await reponse.json()) as unknown;
  if (!reponse.ok) {
    throw new Error(messageErreurHttp(reponse, json));
  }
  return json as WebInstancePasserelle;
}

export async function demarrerWebInstancePasserelle(id: string): Promise<WebInstancePasserelle> {
  const reponse = await appelerJsonAuthentifie(
    `/web-instances/${encodeURIComponent(id)}/start`,
    { method: "POST" },
  );
  const json = (await reponse.json()) as unknown;
  if (!reponse.ok) {
    throw new Error(messageErreurHttp(reponse, json));
  }
  return json as WebInstancePasserelle;
}

export async function arreterWebInstancePasserelle(id: string): Promise<WebInstancePasserelle> {
  const reponse = await appelerJsonAuthentifie(
    `/web-instances/${encodeURIComponent(id)}/stop`,
    { method: "POST" },
  );
  const json = (await reponse.json()) as unknown;
  if (!reponse.ok) {
    throw new Error(messageErreurHttp(reponse, json));
  }
  return json as WebInstancePasserelle;
}

export async function redemarrerWebInstancePasserelle(id: string): Promise<WebInstancePasserelle> {
  const reponse = await appelerJsonAuthentifie(
    `/web-instances/${encodeURIComponent(id)}/restart`,
    { method: "POST" },
  );
  const json = (await reponse.json()) as unknown;
  if (!reponse.ok) {
    throw new Error(messageErreurHttp(reponse, json));
  }
  return json as WebInstancePasserelle;
}

export async function supprimerWebInstancePasserelle(id: string): Promise<void> {
  const reponse = await appelerJsonAuthentifie(
    `/web-instances/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (!reponse.ok) {
    const json = (await reponse.json().catch(() => null)) as unknown;
    throw new Error(messageErreurHttp(reponse, json));
  }
}
