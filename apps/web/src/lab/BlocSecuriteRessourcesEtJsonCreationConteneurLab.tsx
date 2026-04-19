import { SegmentRepliableCreationKidoPanel } from "../interface/SegmentRepliableCreationKidoPanel.js";
import type { EtatCreationConteneurLab } from "./etatCreationConteneurLab.js";
import {
  AIDE_CAP_ADD,
  AIDE_CAP_DROP,
  AIDE_JSON_HEALTHCHECK,
  AIDE_JSON_HOSTCONFIG,
  AIDE_JSON_RESEAU,
  AIDE_MEMOIRE_LIMITE,
  AIDE_NANO_CPUS,
  AIDE_OUVRIR_STDIN,
  AIDE_POLITIQUE_REDEMARRAGE,
  AIDE_PRIVILEGIE,
  AIDE_RACINE_LECTURE_SEULE,
  AIDE_SECURITY_OPT,
  AIDE_TENTATIVES_ON_FAILURE,
  AIDE_TTY,
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

/** Sécurité, ressources, TTY, stdin et blocs JSON avancés (healthcheck, réseau, host). */
export function BlocSecuriteRessourcesEtJsonCreationConteneurLab({
  etat,
  majEtat,
}: Props) {
  return (
    <>
      <SegmentRepliableCreationKidoPanel
        titre="Sécurité Linux : privilèges, capacités, options"
        sousTitre="Privileged, ReadonlyRootfs, CapAdd, CapDrop, SecurityOpt"
      >
        <div style={{ marginBottom: 10 }}>
          <span style={styleTitreChampCreation}>Conteneur privilégié (Privileged)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_PRIVILEGIE} />
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={etat.privileged}
              onChange={(e) => majEtat({ privileged: e.target.checked })}
            />{" "}
            Accorder les privilèges étendus de l’hôte
          </label>
        </div>
        <div style={{ marginBottom: 10 }}>
          <span style={styleTitreChampCreation}>Racine du système de fichiers en lecture seule (ReadonlyRootfs)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_RACINE_LECTURE_SEULE} />
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={etat.racineLectureSeule}
              onChange={(e) => majEtat({ racineLectureSeule: e.target.checked })}
            />{" "}
            Interdire l’écriture sur la racine hors volumes
          </label>
        </div>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Capacités Linux à ajouter (CapAdd)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_CAP_ADD} />
          <input
            value={etat.capacitesAjout}
            onChange={(e) => majEtat({ capacitesAjout: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Capacités Linux à retirer (CapDrop)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_CAP_DROP} />
          <input
            value={etat.capacitesRetrait}
            onChange={(e) => majEtat({ capacitesRetrait: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Options de sécurité du moteur (SecurityOpt)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_SECURITY_OPT} />
          <input
            value={etat.optionsSecurite}
            onChange={(e) => majEtat({ optionsSecurite: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
      </SegmentRepliableCreationKidoPanel>

      <SegmentRepliableCreationKidoPanel
        titre="Limites de ressources et politique de redémarrage"
        sousTitre="Memory, NanoCpus, RestartPolicy"
        defautOuvert
      >
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Limite de mémoire vive (Memory, en Mo saisis)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_MEMOIRE_LIMITE} />
          <input
            value={etat.memoireMegaOctets}
            onChange={(e) => majEtat({ memoireMegaOctets: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Quota processeur (NanoCpus)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_NANO_CPUS} />
          <input
            value={etat.nanoCpus}
            onChange={(e) => majEtat({ nanoCpus: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Politique de redémarrage automatique (RestartPolicy)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_POLITIQUE_REDEMARRAGE} />
          <select
            value={etat.politiqueRedemarrage}
            onChange={(e) =>
              majEtat({
                politiqueRedemarrage: e.target.value as EtatCreationConteneurLab["politiqueRedemarrage"],
              })
            }
            style={styleChampTexteCreation}
          >
            <option value="">(défaut moteur ou image)</option>
            <option value="no">no — ne jamais redémarrer</option>
            <option value="always">always — toujours redémarrer</option>
            <option value="on-failure">on-failure — si code de sortie non nul</option>
            <option value="unless-stopped">unless-stopped — sauf arrêt explicite</option>
          </select>
        </label>
        {etat.politiqueRedemarrage === "on-failure" ? (
          <label style={styleLabelChampCreation}>
            <span style={styleTitreChampCreation}>Nombre maximal de redémarrages (on-failure)</span>
            <TexteAideChampCreationConteneurLab texte={AIDE_TENTATIVES_ON_FAILURE} />
            <input
              value={etat.tentativesMaxOnFailure}
              onChange={(e) => majEtat({ tentativesMaxOnFailure: e.target.value })}
              style={styleChampTexteCreation}
            />
          </label>
        ) : null}
      </SegmentRepliableCreationKidoPanel>

      <SegmentRepliableCreationKidoPanel
        titre="Terminal interactif (TTY) et entrée standard (stdin)"
        sousTitre="Tty, OpenStdin"
      >
        <div style={{ marginBottom: 10 }}>
          <span style={styleTitreChampCreation}>Terminal alloué (Tty)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_TTY} />
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={etat.tty}
              onChange={(e) => majEtat({ tty: e.target.checked })}
            />{" "}
            Allouer un pseudo-terminal
          </label>
        </div>
        <div style={{ marginBottom: 4 }}>
          <span style={styleTitreChampCreation}>Entrée standard ouverte (OpenStdin)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_OUVRIR_STDIN} />
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={etat.entreeStandardOuverte}
              onChange={(e) => majEtat({ entreeStandardOuverte: e.target.checked })}
            />{" "}
            Garder stdin ouvert pour une session interactive
          </label>
        </div>
      </SegmentRepliableCreationKidoPanel>

      <SegmentRepliableCreationKidoPanel
        titre="JSON avancé : healthcheck, réseau nommé, hostConfig additionnel"
        sousTitre="Contrôles hors formulaire principal — alignés sur l’API Docker"
      >
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Contrôle de santé (healthcheck)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_JSON_HEALTHCHECK} />
          <textarea
            value={etat.jsonHealthcheck}
            onChange={(e) => majEtat({ jsonHealthcheck: e.target.value })}
            rows={5}
            placeholder='{"test":["CMD-SHELL","curl -f http://127.0.0.1/ || exit 1"],"intervalSeconds":10}'
            style={{ ...styleChampTexteCreation, minHeight: "5rem" }}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Configuration réseau nommée (networkingConfig)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_JSON_RESEAU} />
          <textarea
            value={etat.jsonConfigurationReseau}
            onChange={(e) => majEtat({ jsonConfigurationReseau: e.target.value })}
            rows={5}
            placeholder='{"endpointsConfig":{"mon_reseau":{"aliases":["web1"]}}}'
            style={{ ...styleChampTexteCreation, minHeight: "5rem" }}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Fragment hostConfig supplémentaire (JSON)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_JSON_HOSTCONFIG} />
          <textarea
            value={etat.jsonHostConfigExtra}
            onChange={(e) => majEtat({ jsonHostConfigExtra: e.target.value })}
            rows={6}
            placeholder='{"Ulimits":[{"Name":"nofile","Soft":64000,"Hard":64000}]}'
            style={{ ...styleChampTexteCreation, minHeight: "6rem" }}
          />
        </label>
      </SegmentRepliableCreationKidoPanel>
    </>
  );
}
