import {
  appelerJsonAuthentifiePasserelle,
  lireJsonReponseOuNull,
  messageErreurHttpDepuisJson,
} from "./client-http-authentifie-passerelle.js";

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
  const reponse = await appelerJsonAuthentifiePasserelle("/reseaux-internes", {
    method: "GET",
  });
  const json = await lireJsonReponseOuNull(reponse);
  if (!reponse.ok) {
    throw new Error(messageErreurHttpDepuisJson(reponse, json));
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
}

export type CorpsCreationReseauInternePasserelle = {
  nomAffichage: string;
  sousReseauCidr: string;
  sansRouteVersInternetExterne?: boolean;
};

/** Crée un pont utilisateur (`POST /reseaux-internes`). */
export async function creerReseauInternePasserelle(
  corps: CorpsCreationReseauInternePasserelle,
): Promise<EnregistrementReseauInternePasserelle> {
  const reponse = await appelerJsonAuthentifiePasserelle("/reseaux-internes", {
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
  const reponse = await appelerJsonAuthentifiePasserelle(
    `/reseaux-internes/${encodeURIComponent(idReseau)}`,
    {
    method: "DELETE",
    },
  );
  if (!reponse.ok) {
    const json = await lireJsonReponseOuNull(reponse);
    throw new Error(messageErreurHttpDepuisJson(reponse, json));
  }
}
