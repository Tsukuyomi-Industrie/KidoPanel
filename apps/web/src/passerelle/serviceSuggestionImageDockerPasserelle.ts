import { formaterErreurReseauFetch } from "../lab/passerelleErreursAffichageLab.js";
import { lireJetonPasserelle } from "./jetonPasserelleStockage.js";
import { urlBasePasserelle } from "./url-base-passerelle.js";

/** Extrait un message lisible depuis une error_ JSON API (moteur, validation Zod, etc.). */
function extraireMessageErreurCorpsHttp(corps: unknown, statutHttp: number): string {
  if (typeof corps === "object" && corps !== null) {
    const o = corps as Record<string, unknown>;
    const error_ = o.error;
    if (typeof error_ === "object" && error_ !== null) {
      const msg = (error_ as { message?: unknown }).message;
      if (typeof msg === "string" && msg.trim().length > 0) {
        return msg.trim();
      }
    }
    if (typeof o.message === "string" && o.message.trim().length > 0) {
      return o.message.trim();
    }
    const issues = o.issues;
    if (Array.isArray(issues) && issues.length > 0) {
      const premier = issues[0] as { message?: unknown };
      if (typeof premier.message === "string" && premier.message.length > 0) {
        return premier.message;
      }
    }
  }
  return `Erreur HTTP ${String(statutHttp)}`;
}

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
    let json: unknown;
    try {
      json = (await reponse.json()) as unknown;
    } catch {
      throw new Error(`Erreur HTTP ${String(reponse.status)} (réponse non JSON).`);
    }
    if (!reponse.ok) {
      throw new Error(extraireMessageErreurCorpsHttp(json, reponse.status));
    }
    return json as SuggestionImageDockerPasserelle;
  } catch (error_) {
    throw new Error(formaterErreurReseauFetch(url, error_));
  }
}
