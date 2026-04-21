import {
  appelerJsonAuthentifiePasserelle,
  lireJsonReponseOuNull,
  messageErreurHttpDepuisJson,
} from "./client-http-authentifie-passerelle.js";

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

export async function listerWebInstancesPasserelle(): Promise<WebInstancePasserelle[]> {
  const reponse = await appelerJsonAuthentifiePasserelle("/web-instances", { method: "GET" });
  const json = await lireJsonReponseOuNull(reponse);
  if (!reponse.ok) {
    throw new Error(messageErreurHttpDepuisJson(reponse, json));
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
  const reponse = await appelerJsonAuthentifiePasserelle(
    `/web-instances/${encodeURIComponent(id)}`,
    { method: "GET" },
  );
  const json = await lireJsonReponseOuNull(reponse);
  if (!reponse.ok) {
    throw new Error(messageErreurHttpDepuisJson(reponse, json));
  }
  return json as WebInstancePasserelle;
}

export async function creerWebInstancePasserelle(
  corps: CorpsCreationWebInstance,
): Promise<WebInstancePasserelle> {
  const reponse = await appelerJsonAuthentifiePasserelle("/web-instances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  const json = await lireJsonReponseOuNull(reponse);
  if (!reponse.ok) {
    throw new Error(messageErreurHttpDepuisJson(reponse, json));
  }
  return json as WebInstancePasserelle;
}

export async function demarrerWebInstancePasserelle(id: string): Promise<WebInstancePasserelle> {
  const reponse = await appelerJsonAuthentifiePasserelle(
    `/web-instances/${encodeURIComponent(id)}/start`,
    { method: "POST" },
  );
  const json = await lireJsonReponseOuNull(reponse);
  if (!reponse.ok) {
    throw new Error(messageErreurHttpDepuisJson(reponse, json));
  }
  return json as WebInstancePasserelle;
}

export async function arreterWebInstancePasserelle(id: string): Promise<WebInstancePasserelle> {
  const reponse = await appelerJsonAuthentifiePasserelle(
    `/web-instances/${encodeURIComponent(id)}/stop`,
    { method: "POST" },
  );
  const json = await lireJsonReponseOuNull(reponse);
  if (!reponse.ok) {
    throw new Error(messageErreurHttpDepuisJson(reponse, json));
  }
  return json as WebInstancePasserelle;
}

export async function redemarrerWebInstancePasserelle(id: string): Promise<WebInstancePasserelle> {
  const reponse = await appelerJsonAuthentifiePasserelle(
    `/web-instances/${encodeURIComponent(id)}/restart`,
    { method: "POST" },
  );
  const json = await lireJsonReponseOuNull(reponse);
  if (!reponse.ok) {
    throw new Error(messageErreurHttpDepuisJson(reponse, json));
  }
  return json as WebInstancePasserelle;
}

export async function supprimerWebInstancePasserelle(id: string): Promise<void> {
  const reponse = await appelerJsonAuthentifiePasserelle(
    `/web-instances/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (!reponse.ok) {
    const json = await lireJsonReponseOuNull(reponse);
    throw new Error(messageErreurHttpDepuisJson(reponse, json));
  }
}
