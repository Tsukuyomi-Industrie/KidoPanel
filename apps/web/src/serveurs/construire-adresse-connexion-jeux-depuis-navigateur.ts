/**
 * Fabrique « hôte : port » pour les joueurs.
 *
 * Ordre de priorité :
 * 1. **`forcerHotePageNavigateur=true`** : utilise toujours le hostname de la page (utile pour tester en LAN
 *    quand la passerelle a détecté l’IP publique du FAI mais que vous ouvrez le panel via l’IP locale).
 * 2. Sinon, l’hôte fourni par la passerelle (`GATEWAY_PUBLIC_HOST_FOR_CLIENTS`) s’il est défini.
 * 3. Sinon, le hostname de la page (`globalThis.window.location.hostname`, loopback ramené à 127.0.0.1).
 */
export function construireAdresseConnexionJeux(params: {
  port: number;
  hotePublicConfigurePasserelle?: string | null;
  forcerHotePageNavigateur?: boolean;
}): string {
  const hoteNavigateurBrut = globalThis.window?.location.hostname ?? "";
  const hoteNavigateur =
    hoteNavigateurBrut === "localhost" ||
    hoteNavigateurBrut === "127.0.0.1" ||
    hoteNavigateurBrut === "[::1]"
      ? "127.0.0.1"
      : hoteNavigateurBrut;
  if (params.forcerHotePageNavigateur === true && hoteNavigateur.length > 0) {
    return `${hoteNavigateur}:${String(params.port)}`;
  }
  const pref = params.hotePublicConfigurePasserelle?.trim();
  if (pref !== undefined && pref.length > 0) {
    return `${pref}:${String(params.port)}`;
  }
  if (hoteNavigateur.length === 0) {
    return `:${String(params.port)}`;
  }
  return `${hoteNavigateur}:${String(params.port)}`;
}
