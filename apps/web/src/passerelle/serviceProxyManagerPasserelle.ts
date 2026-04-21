import {
  appelerJsonAuthentifiePasserelle,
  lireJsonReponseOuNull,
  messageErreurHttpDepuisJson,
} from "./client-http-authentifie-passerelle.js";

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

export async function listerDomainesProxyPasserelle(): Promise<DomaineProxyPasserelle[]> {
  const reponse = await appelerJsonAuthentifiePasserelle("/proxy/domaines", { method: "GET" });
  const json = await lireJsonReponseOuNull(reponse);
  if (!reponse.ok) {
    throw new Error(messageErreurHttpDepuisJson(reponse, json));
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
  const reponse = await appelerJsonAuthentifiePasserelle("/proxy/domaines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  const json = await lireJsonReponseOuNull(reponse);
  if (!reponse.ok) {
    throw new Error(messageErreurHttpDepuisJson(reponse, json));
  }
  return json as DomaineProxyPasserelle;
}

export async function supprimerDomaineProxyPasserelle(id: string): Promise<void> {
  const reponse = await appelerJsonAuthentifiePasserelle(
    `/proxy/domaines/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (!reponse.ok) {
    const json = await lireJsonReponseOuNull(reponse);
    throw new Error(messageErreurHttpDepuisJson(reponse, json));
  }
}

export async function rechargerProxyPasserelle(): Promise<void> {
  const reponse = await appelerJsonAuthentifiePasserelle("/proxy/reload", { method: "POST" });
  if (!reponse.ok) {
    const json = await lireJsonReponseOuNull(reponse);
    throw new Error(messageErreurHttpDepuisJson(reponse, json));
  }
}
