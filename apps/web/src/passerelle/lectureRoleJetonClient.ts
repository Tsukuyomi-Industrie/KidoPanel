import { decoderPayloadJetonClient } from "./decoder-payload-jeton-client.js";

/** Rôle métier attendu dans le corps JWT après décodage Base64URL (affichage interface uniquement). */
export type RoleUtilisateurJetonClient = "ADMIN" | "USER" | "VIEWER";

/**
 * Extrait le rôle depuis le JWT sans vérifier la signature : garde d’interface et libellés uniquement.
 */
export function extraireRoleDepuisJetonClient(
  jeton: string,
): RoleUtilisateurJetonClient {
  const payload = decoderPayloadJetonClient(jeton);
  if (payload === null) {
    return "USER";
  }
  const role = payload.role;
  if (role === "ADMIN" || role === "USER" || role === "VIEWER") {
    return role;
  }
  return "USER";
}
