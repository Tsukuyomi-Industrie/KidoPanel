import { formaterErreurReseauFetch } from "../lab/passerelleErreursAffichageLab.js";
import { lireJetonPasserelle } from "./jetonPasserelleStockage.js";
import { urlBasePasserelle } from "./url-base-passerelle.js";

/** Proposition renvoyée par le moteur après inspection d’image Docker. */
export type SuggestionImageDockerPasserelle = {
  referenceDocker: string;
  cmd?: string[];
  entrypoint?: string[];
  workingDir?: string;
  env?: Record<string, string>;
  exposedPorts?: string[];
  tty?: boolean;
  openStdin?: boolean;
  avertissements: string[];
};

/** Interroge le moteur via la passerelle pour obtenir une configuration minimale cohérente avec l’image (après tirage éventuel). */
export async function chargerSuggestionConfigurationImageDocker(
  params: { imageReference: string },
): Promise<SuggestionImageDockerPasserelle> {
  const jeton = lireJetonPasserelle().trim();
  if (!jeton) {
    throw new Error("Jeton d’accès absent : reconnectez-vous au panel.");
  }
  const reference = params.imageReference.trim();
  if (reference.length === 0) {
    throw new Error("Indiquez d’abord une référence d’image Docker.");
  }
  const qs = new URLSearchParams({
    imageReference: reference,
  });
  const base = urlBasePasserelle().replace(/\/$/, "");
  const url = `${base}/images/suggestion?${qs.toString()}`;
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
    return json as SuggestionImageDockerPasserelle;
  } catch (erreur) {
    throw new Error(formaterErreurReseauFetch(url, erreur));
  }
}
