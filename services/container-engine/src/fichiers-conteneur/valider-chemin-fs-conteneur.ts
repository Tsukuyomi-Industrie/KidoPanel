/** Taille maximale pour lecture ou écriture « fichiers » via HTTP (protection mémoire). */
export const FS_CONTENEUR_OCTETS_MAX_FICHIER_TEXTE = 524_288;

/** Caractères autorisés dans un segment de chemin absolu (chemins métier prévisibles). */
const SEGMENT_CHEMIN_SAFE = /^[a-zA-Z0-9_.-]+$/;

/**
 * Normalise un chemin POSIX absolu et rejette les traversées (`..`).
 * Réduction volontairement stricte pour éviter les injections lors des orchestrations shell ultérieures.
 */
export function normaliserCheminAbsoluFsConteneur(entree: string): string {
  const brut = entree.trim();
  if (!brut.startsWith("/")) {
    throw new Error("Chemin non absolu.");
  }
  const segments = brut.split("/").filter((s) => s.length > 0);
  for (const segment of segments) {
    if (segment === "..") {
      throw new Error("Segment « .. » interdit.");
    }
    if (!SEGMENT_CHEMIN_SAFE.test(segment)) {
      throw new Error("Caractères non autorisés dans le chemin.");
    }
  }
  if (segments.length === 0) {
    return "/";
  }
  return `/${segments.join("/")}`;
}
