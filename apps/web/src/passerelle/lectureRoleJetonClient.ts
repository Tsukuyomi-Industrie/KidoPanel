/** Rôle métier attendu dans le corps JWT après décodage Base64URL (affichage interface uniquement). */
export type RoleUtilisateurJetonClient = "ADMIN" | "USER" | "VIEWER";

function decoderSegmentPayloadJwt(jeton: string): Record<string, unknown> | null {
  const segments = jeton.split(".");
  if (segments.length < 2) {
    return null;
  }
  const payloadBrut = segments[1];
  if (payloadBrut === undefined || payloadBrut.length === 0) {
    return null;
  }
  let base64 = payloadBrut.replaceAll("-", "+").replaceAll("_", "/");
  const reste = base64.length % 4;
  if (reste === 2) {
    base64 += "==";
  } else if (reste === 3) {
    base64 += "=";
  }
  try {
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Extrait le rôle depuis le JWT sans vérifier la signature : garde d’interface et libellés uniquement.
 */
export function extraireRoleDepuisJetonClient(
  jeton: string,
): RoleUtilisateurJetonClient {
  const payload = decoderSegmentPayloadJwt(jeton);
  if (payload === null) {
    return "USER";
  }
  const role = payload.role;
  if (role === "ADMIN" || role === "USER" || role === "VIEWER") {
    return role;
  }
  return "USER";
}
