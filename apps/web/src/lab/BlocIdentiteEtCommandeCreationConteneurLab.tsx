import type { EtatCreationConteneurLab } from "./etatCreationConteneurLab.js";
import {
  styleChampTexteCreation,
  styleLabelChampCreation,
} from "./stylesFormulaireCreationConteneurLab.js";

type Props = {
  etat: EtatCreationConteneurLab;
  majEtat: (partiel: Partial<EtatCreationConteneurLab>) => void;
};

/** Identité de l’image, nom du conteneur, commande, entrypoint et identité processus. */
export function BlocIdentiteEtCommandeCreationConteneurLab({
  etat,
  majEtat,
}: Props) {
  return (
    <>
      <label style={styleLabelChampCreation}>
        Image (obligatoire)
        <input
          value={etat.image}
          onChange={(e) => majEtat({ image: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <label style={styleLabelChampCreation}>
        Nom du conteneur
        <input
          value={etat.nom}
          onChange={(e) => majEtat({ nom: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>

      <details style={{ marginBottom: 10 }}>
        <summary>Commande et processus</summary>
        <label style={styleLabelChampCreation}>
          Cmd (un argument par ligne)
          <textarea
            value={etat.cmdLignes}
            onChange={(e) => majEtat({ cmdLignes: e.target.value })}
            rows={4}
            style={{ ...styleChampTexteCreation, minHeight: "4.5rem" }}
          />
        </label>
        <label style={styleLabelChampCreation}>
          Entrypoint (une entrée par ligne)
          <textarea
            value={etat.entrypointLignes}
            onChange={(e) => majEtat({ entrypointLignes: e.target.value })}
            rows={3}
            style={{ ...styleChampTexteCreation, minHeight: "3.2rem" }}
          />
        </label>
        <label style={styleLabelChampCreation}>
          Répertoire de travail
          <input
            value={etat.repertoireTravail}
            onChange={(e) => majEtat({ repertoireTravail: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          Utilisateur (uid ou utilisateur:gid)
          <input
            value={etat.utilisateur}
            onChange={(e) => majEtat({ utilisateur: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          Hostname conteneur
          <input
            value={etat.nomHote}
            onChange={(e) => majEtat({ nomHote: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
      </details>
    </>
  );
}
