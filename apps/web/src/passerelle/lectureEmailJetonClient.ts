/**
 * Extrait l’adresse e-mail du corps JWT (sans vérifier la signature : affichage interface uniquement).
 */
export function extraireEmailDepuisJetonClient(jeton: string): string | null {
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
    const parse = JSON.parse(json) as { email?: unknown };
    return typeof parse.email === "string" ? parse.email : null;
  } catch {
    return null;
  }
}
