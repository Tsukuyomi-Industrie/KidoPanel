import { SegmentRepliableCreationKidoPanel } from "../interface/SegmentRepliableCreationKidoPanel.js";
import type { EtatCreationConteneurLab } from "./etatCreationConteneurLab.js";
import {
  AIDE_ATTACHER_STDERR,
  AIDE_ATTACHER_STDIN,
  AIDE_ATTACHER_STDOUT,
  AIDE_DELAI_ARRET,
  AIDE_PLATEFORME_DOCKER,
  AIDE_RESEAU_DESACTIVE,
  AIDE_STDIN_UNE_FOIS,
} from "./definitionsAidesCreationConteneurLab.js";
import {
  styleChampTexteCreation,
  styleLabelChampCreation,
  styleTitreChampCreation,
} from "./stylesFormulaireCreationConteneurLab.js";
import { TexteAideChampCreationConteneurLab } from "./TexteAideChampCreationConteneurLab.js";

type Props = {
  readonly etat: EtatCreationConteneurLab;
  readonly majEtat: (partiel: Partial<EtatCreationConteneurLab>) => void;
};

/** Champs de la ressource de création Docker hors `hostConfig` (plateforme, délais, attachements flux). */
export function BlocOptionsMoteurDockerCreationConteneurLab({
  etat,
  majEtat,
}: Props) {
  return (
    <SegmentRepliableCreationKidoPanel
      titre="Plateforme, délais d’arrêt et attachement des flux"
      sousTitre="Champs hors hostConfig : platform, StopTimeout, réseau désactivé, attachStdin ou stdout"
    >
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Plateforme d’image (platform)</span>
        <TexteAideChampCreationConteneurLab texte={AIDE_PLATEFORME_DOCKER} />
        <input
          value={etat.platformeDocker}
          onChange={(e) => majEtat({ platformeDocker: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Délai avant arrêt forcé (StopTimeout, secondes)</span>
        <TexteAideChampCreationConteneurLab texte={AIDE_DELAI_ARRET} />
        <input
          value={etat.delaiArretSecondes}
          onChange={(e) => majEtat({ delaiArretSecondes: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <div style={{ marginBottom: 10 }}>
        <span style={styleTitreChampCreation}>Désactiver la pile réseau du conteneur</span>
        <TexteAideChampCreationConteneurLab texte={AIDE_RESEAU_DESACTIVE} />
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={etat.desactiverReseauConteneur}
            onChange={(e) => majEtat({ desactiverReseauConteneur: e.target.checked })}
          />{" "}
          Désactiver la pile réseau du conteneur
        </label>
      </div>
      <p style={{ ...styleTitreChampCreation, marginTop: 8 }}>Attachement des flux (API Docker)</p>
      <div style={{ marginBottom: 8 }}>
        <TexteAideChampCreationConteneurLab texte={AIDE_ATTACHER_STDIN} />
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={etat.attacherStdin}
            onChange={(e) => majEtat({ attacherStdin: e.target.checked })}
          />{" "}
          Attacher le flux stdin
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <TexteAideChampCreationConteneurLab texte={AIDE_ATTACHER_STDOUT} />
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={etat.attacherStdout}
            onChange={(e) => majEtat({ attacherStdout: e.target.checked })}
          />{" "}
          Attacher le flux stdout
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <TexteAideChampCreationConteneurLab texte={AIDE_ATTACHER_STDERR} />
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={etat.attacherStderr}
            onChange={(e) => majEtat({ attacherStderr: e.target.checked })}
          />{" "}
          Attacher le flux stderr
        </label>
      </div>
      <div style={{ marginBottom: 4 }}>
        <TexteAideChampCreationConteneurLab texte={AIDE_STDIN_UNE_FOIS} />
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={etat.stdinUneFois}
            onChange={(e) => majEtat({ stdinUneFois: e.target.checked })}
          />{" "}
          Fermer stdin après une attache unique
        </label>
      </div>
    </SegmentRepliableCreationKidoPanel>
  );
}
