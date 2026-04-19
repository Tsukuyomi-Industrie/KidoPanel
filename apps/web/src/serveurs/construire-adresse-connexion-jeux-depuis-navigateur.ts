/**
 * Fabrique « hôte : port » pour les joueurs : variable passerelle **`GATEWAY_PUBLIC_HOST_FOR_CLIENTS`** en priorité,
 * sinon le hostname de la page (localhost ramené à 127.0.0.1).
 */
export function construireAdresseConnexionJeux(params: {
  port: number;
  hotePublicConfigurePasserelle?: string | null;
}): string {
  const pref = params.hotePublicConfigurePasserelle?.trim();
  if (pref !== undefined && pref.length > 0) {
    return `${pref}:${String(params.port)}`;
  }
  if (typeof window === "undefined") {
    return `:${String(params.port)}`;
  }
  const h = window.location.hostname;
  const hote =
    h === "localhost" || h === "127.0.0.1" || h === "[::1]" ? "127.0.0.1" : h;
  return `${hote}:${String(params.port)}`;
}
