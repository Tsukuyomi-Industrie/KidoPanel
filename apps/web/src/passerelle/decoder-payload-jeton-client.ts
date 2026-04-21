/** Décode le payload Base64URL d’un JWT côté interface, sans vérification de signature. */
export function decoderPayloadJetonClient(
  jeton: string,
): Record<string, unknown> | null {
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
