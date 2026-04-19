import { SegmentRepliableCreationKidoPanel } from "../interface/SegmentRepliableCreationKidoPanel.js";
import type { EtatCreationConteneurLab } from "./etatCreationConteneurLab.js";
import {
  AIDE_BINDS,
  AIDE_DNS_SERVEURS,
  AIDE_ETIQUETTES,
  AIDE_EXTRA_HOSTS,
  AIDE_LIAISON_PORTS,
  AIDE_MODE_RESEAU,
  AIDE_PUBLIER_TOUS_PORTS,
  AIDE_VARIABLES_ENVIRONNEMENT,
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

/** Réseau, ports, DNS, extra hosts, variables, étiquettes et montages bind. */
export function BlocReseauEtEnvironnementCreationConteneurLab({
  etat,
  majEtat,
}: Props) {
  return (
    <>
      <SegmentRepliableCreationKidoPanel
        titre="Réseau, publication de ports et résolution DNS"
        sousTitre="NetworkMode, liaisons de ports, Dns, ExtraHosts, PublishAllPorts"
        defautOuvert
      >
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Mode réseau (NetworkMode)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_MODE_RESEAU} />
          <input
            value={etat.modeReseau}
            onChange={(e) => majEtat({ modeReseau: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Publication de ports (ports conteneur → hôte)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_LIAISON_PORTS} />
          <textarea
            value={etat.liaisonPortsTexte}
            onChange={(e) => majEtat({ liaisonPortsTexte: e.target.value })}
            rows={4}
            style={{ ...styleChampTexteCreation, minHeight: "4rem" }}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Serveurs DNS du conteneur (Dns)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_DNS_SERVEURS} />
          <input
            value={etat.dnsListe}
            onChange={(e) => majEtat({ dnsListe: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Entrées fichier hosts supplémentaires (ExtraHosts)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_EXTRA_HOSTS} />
          <input
            value={etat.hotesSupplementaires}
            onChange={(e) => majEtat({ hotesSupplementaires: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <div style={{ marginBottom: 10 }}>
          <span style={styleTitreChampCreation}>Publier tous les ports déclarés par l’image</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_PUBLIER_TOUS_PORTS} />
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={etat.publierTousLesPorts}
              onChange={(e) => majEtat({ publierTousLesPorts: e.target.checked })}
            />{" "}
            Publier automatiquement tous les ports exposés par l’image
          </label>
        </div>
      </SegmentRepliableCreationKidoPanel>

      <SegmentRepliableCreationKidoPanel
        titre="Environnement, étiquettes et volumes montés depuis l’hôte"
        sousTitre="Env, Labels, Binds"
      >
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Variables d’environnement (Env)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_VARIABLES_ENVIRONNEMENT} />
          <textarea
            value={etat.variablesEnvironnement}
            onChange={(e) => majEtat({ variablesEnvironnement: e.target.value })}
            rows={5}
            style={{ ...styleChampTexteCreation, minHeight: "5rem" }}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Étiquettes du conteneur (Labels)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_ETIQUETTES} />
          <textarea
            value={etat.etiquettes}
            onChange={(e) => majEtat({ etiquettes: e.target.value })}
            rows={3}
            style={{ ...styleChampTexteCreation, minHeight: "3rem" }}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Montages bind (Binds : hôte → conteneur)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_BINDS} />
          <textarea
            value={etat.montagesBinds}
            onChange={(e) => majEtat({ montagesBinds: e.target.value })}
            rows={4}
            style={{ ...styleChampTexteCreation, minHeight: "4rem" }}
          />
        </label>
      </SegmentRepliableCreationKidoPanel>
    </>
  );
}
