const UN_KIBIOCTET = 1024;
const UN_MEBIOCTET = UN_KIBIOCTET * UN_KIBIOCTET;

export const LIMITE_OCTETS_EDITION_FICHIER_TEXTE = 2 * UN_MEBIOCTET;

function formaterTailleLisible(octets: number): string {
  if (octets < UN_KIBIOCTET) return `${String(octets)} o`;
  if (octets < UN_MEBIOCTET) return `${(octets / UN_KIBIOCTET).toFixed(1)} Ko`;
  return `${(octets / UN_MEBIOCTET).toFixed(1)} Mo`;
}

/** Retourne un message d'erreur lisible quand le fichier dépasse la limite d'édition. */
export function creerMessageFichierTropVolumineux(octets: number): string {
  return [
    `Fichier trop volumineux pour l'éditeur intégré (${formaterTailleLisible(octets)}).`,
    `Limite actuelle: ${formaterTailleLisible(LIMITE_OCTETS_EDITION_FICHIER_TEXTE)}.`,
    "Utilisez une archive zip ou un éditeur externe pour ce fichier.",
  ].join(" ");
}
