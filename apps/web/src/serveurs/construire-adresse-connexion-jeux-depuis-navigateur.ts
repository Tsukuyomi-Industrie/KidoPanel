/**
 * Fabrique une chaîne « IP ou nom d’hôte : port » pour les joueurs, en réutilisant le hostname de la page
 * (souvent l’IP publique ou le domaine utilisé pour ouvrir le panel sur un VPS).
 */
export function construireAdresseConnexionJeuxDepuisNavigateur(port: number): string {
  if (typeof window === "undefined") {
    return `:${String(port)}`;
  }
  const h = window.location.hostname;
  const hote =
    h === "localhost" || h === "127.0.0.1" || h === "[::1]" ? "127.0.0.1" : h;
  return `${hote}:${String(port)}`;
}
