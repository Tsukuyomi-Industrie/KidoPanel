import { decoderPayloadJetonClient } from "./decoder-payload-jeton-client.js";

/**
 * Extrait l’adresse e-mail du corps JWT (sans vérifier la signature : affichage interface uniquement).
 */
export function extraireEmailDepuisJetonClient(jeton: string): string | null {
  const payload = decoderPayloadJetonClient(jeton);
  if (payload === null) {
    return null;
  }
  return typeof payload.email === "string" ? payload.email : null;
}
