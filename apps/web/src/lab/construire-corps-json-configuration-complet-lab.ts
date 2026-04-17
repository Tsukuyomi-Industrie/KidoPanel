import { construireCorpsCreationConteneurDepuisEtat } from "./corpsCreationConteneurLab.js";
import {
  creerCorpsJsonModeleComplet,
  fusionnerModeleCorpsEtPartiel,
} from "./corps-json-modele-complet-lab.js";
import type { EtatCreationConteneurLab } from "./etatCreationConteneurLab.js";

/**
 * Construit le corps JSON « configuration complète » : toutes les clés du modèle y sont présentes,
 * surchargées par les valeurs issues du formulaire (équivalent `POST /containers` enrichi).
 */
export function construireCorpsJsonConfigurationComplet(
  etat: EtatCreationConteneurLab,
): Record<string, unknown> {
  const partiel = construireCorpsCreationConteneurDepuisEtat(etat);
  const modele = creerCorpsJsonModeleComplet();
  return fusionnerModeleCorpsEtPartiel(modele, partiel);
}

/**
 * Normalise un corps JSON déjà sauvegardé ou édité pour y réinjecter les clés manquantes du modèle complet.
 */
export function normaliserCorpsJsonVersConfigurationComplete(
  corps: Record<string, unknown>,
): Record<string, unknown> {
  return fusionnerModeleCorpsEtPartiel(creerCorpsJsonModeleComplet(), corps);
}
