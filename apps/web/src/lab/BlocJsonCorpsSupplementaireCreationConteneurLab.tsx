import type { EtatCreationConteneurLab } from "./etatCreationConteneurLab.js";
import {
  styleChampTexteCreation,
  styleLabelChampCreation,
  styleTitreChampCreation,
} from "./stylesFormulaireCreationConteneurLab.js";
import { TexteAideChampCreationConteneurLab } from "./TexteAideChampCreationConteneurLab.js";

type Props = {
  etat: EtatCreationConteneurLab;
  majEtat: (partiel: Partial<EtatCreationConteneurLab>) => void;
};

const AIDE_JSON_CORPS_SUPPLEMENTAIRE =
  "Objet JSON fusionné en premier dans le corps `POST /containers` avant les champs du formulaire (ex. volumes, onBuild, shell, exposedPorts seuls). Laisser vide si inutile. Doit être un objet JSON valide.";

/** Champs de corps d’API non représentés par des contrôles dédiés (laboratoire). */
export function BlocJsonCorpsSupplementaireCreationConteneurLab({
  etat,
  majEtat,
}: Props) {
  return (
    <details style={{ marginBottom: 10 }}>
      <summary>JSON supplémentaire au corps (racine de l’API)</summary>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Fragment JSON au niveau racine du corps de création</span>
        <TexteAideChampCreationConteneurLab texte={AIDE_JSON_CORPS_SUPPLEMENTAIRE} />
        <textarea
          value={etat.jsonCorpsSupplementaireTop}
          onChange={(e) => majEtat({ jsonCorpsSupplementaireTop: e.target.value })}
          rows={4}
          placeholder='{"volumes":{"/data":{}}}'
          style={{ ...styleChampTexteCreation, minHeight: "4rem" }}
        />
      </label>
    </details>
  );
}
