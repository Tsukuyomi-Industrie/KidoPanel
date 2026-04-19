/**
 * Harmonise l’hôte pour les services locaux appelés depuis la passerelle.
 * Sur plusieurs systèmes Linux, « localhost » est résolu en IPv6 (::1) en premier ; Node « fetch » tente alors [::1]:port.
 * Si le service métier écoute uniquement sur IPv4 (127.0.0.1), la connexion est refusée sans message explicite côté utilisateur.
 */
export function normaliserUrlBasePourFetchLoopbackIpv4(urlSansFinSlash: string): string {
  const avecSlash = urlSansFinSlash.endsWith("/") ? urlSansFinSlash : `${urlSansFinSlash}/`;
  let u: URL;
  try {
    u = new URL(avecSlash);
  } catch {
    return urlSansFinSlash.replace(/\/+$/, "");
  }
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h === "::1") {
    u.hostname = "127.0.0.1";
  }
  return u.toString().replace(/\/+$/, "");
}
