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
