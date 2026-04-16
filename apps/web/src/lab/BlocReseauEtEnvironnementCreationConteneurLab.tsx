import type { EtatCreationConteneurLab } from "./etatCreationConteneurLab.js";
import {
  styleChampTexteCreation,
  styleLabelChampCreation,
} from "./stylesFormulaireCreationConteneurLab.js";

type Props = {
  etat: EtatCreationConteneurLab;
  majEtat: (partiel: Partial<EtatCreationConteneurLab>) => void;
};

/** Réseau, ports, DNS, extra hosts, variables, étiquettes et montages bind. */
export function BlocReseauEtEnvironnementCreationConteneurLab({
  etat,
  majEtat,
}: Props) {
  return (
    <>
      <details style={{ marginBottom: 10 }}>
        <summary>Réseau et ports</summary>
        <label style={styleLabelChampCreation}>
          Mode réseau (ex. bridge, host, none, nom de réseau)
          <input
            value={etat.modeReseau}
            onChange={(e) => majEtat({ modeReseau: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          Liaisons hôte (une par ligne : <code>80/tcp=8080</code>)
          <textarea
            value={etat.liaisonPortsTexte}
            onChange={(e) => majEtat({ liaisonPortsTexte: e.target.value })}
            rows={4}
            style={{ ...styleChampTexteCreation, minHeight: "4rem" }}
          />
        </label>
        <label style={styleLabelChampCreation}>
          Serveurs DNS (séparés par des virgules)
          <input
            value={etat.dnsListe}
            onChange={(e) => majEtat({ dnsListe: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          Extra hosts (séparés par des virgules)
          <input
            value={etat.hotesSupplementaires}
            onChange={(e) => majEtat({ hotesSupplementaires: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={etat.publierTousLesPorts}
            onChange={(e) => majEtat({ publierTousLesPorts: e.target.checked })}
          />
          Publier tous les ports exposés de l’image
        </label>
      </details>

      <details style={{ marginBottom: 10 }}>
        <summary>Environnement, étiquettes, montages</summary>
        <label style={styleLabelChampCreation}>
          Variables d’environnement (<code>CLE=VALEUR</code> par ligne)
          <textarea
            value={etat.variablesEnvironnement}
            onChange={(e) => majEtat({ variablesEnvironnement: e.target.value })}
            rows={5}
            style={{ ...styleChampTexteCreation, minHeight: "5rem" }}
          />
        </label>
        <label style={styleLabelChampCreation}>
          Étiquettes (<code>CLE=VALEUR</code> par ligne)
          <textarea
            value={etat.etiquettes}
            onChange={(e) => majEtat({ etiquettes: e.target.value })}
            rows={3}
            style={{ ...styleChampTexteCreation, minHeight: "3rem" }}
          />
        </label>
        <label style={styleLabelChampCreation}>
          Binds (une ligne par montage, syntaxe Docker)
          <textarea
            value={etat.montagesBinds}
            onChange={(e) => majEtat({ montagesBinds: e.target.value })}
            rows={4}
            style={{ ...styleChampTexteCreation, minHeight: "4rem" }}
          />
        </label>
      </details>
    </>
  );
}
