import { SegmentRepliableCreationKidoPanel } from "../interface/SegmentRepliableCreationKidoPanel.js";
import type { EtatCreationConteneurLab } from "./etatCreationConteneurLab.js";
import * as Aides from "./definitionsAidesCreationConteneurLab.js";
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

/**
 * Options d’hôte fréquentes dans Portainer : IPC, PID, runtime, mémoire avancée, cgroup, volumesFrom.
 */
export function BlocHoteRuntimeEtMemoireCreationConteneurLab({
  etat,
  majEtat,
}: Props) {
  return (
    <SegmentRepliableCreationKidoPanel
      titre="Hôte Docker : IPC, PID, runtime, mémoire, cgroup, volumes"
      sousTitre="DnsSearch, DnsOptions, namespaces, réservation mémoire, volumesFrom, consoleSize"
    >
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Suffixes de recherche DNS (DnsSearch)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_DNS_SEARCH} />
        <input
          value={etat.rechercheDns}
          onChange={(e) => majEtat({ rechercheDns: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Options du résolveur DNS (DnsOptions)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_DNS_OPTIONS} />
        <input
          value={etat.optionsDns}
          onChange={(e) => majEtat({ optionsDns: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Mode IPC (IpcMode)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_MODE_IPC} />
        <input
          value={etat.modeIpc}
          onChange={(e) => majEtat({ modeIpc: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Mode PID (PidMode)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_MODE_PID} />
        <input
          value={etat.modePid}
          onChange={(e) => majEtat({ modePid: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Mode UTS (UTSMode)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_MODE_UTS} />
        <input
          value={etat.modeUts}
          onChange={(e) => majEtat({ modeUts: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Mode user namespace (UsernsMode)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_MODE_USERNS} />
        <input
          value={etat.modeUserns}
          onChange={(e) => majEtat({ modeUserns: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Espace de noms cgroup (CgroupnsMode)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_CGROUPNS} />
        <select
          value={etat.cgroupnsMode}
          onChange={(e) =>
            majEtat({
              cgroupnsMode: e.target.value as EtatCreationConteneurLab["cgroupnsMode"],
            })
          }
          style={styleChampTexteCreation}
        >
          <option value="">(défaut moteur)</option>
          <option value="private">private</option>
          <option value="host">host</option>
        </select>
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Runtime OCI (Runtime)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_RUNTIME_OCI} />
        <input
          value={etat.runtimeConteneur}
          onChange={(e) => majEtat({ runtimeConteneur: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Mémoire réservée (MemoryReservation, Mo)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_MEMOIRE_RESERVEE} />
        <input
          value={etat.memoireReservationMegaOctets}
          onChange={(e) => majEtat({ memoireReservationMegaOctets: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Plafond mémoire + swap (MemorySwap, Mo ou -1)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_MEMOIRE_SWAP} />
        <input
          value={etat.memoireSwapMegaOctets}
          onChange={(e) => majEtat({ memoireSwapMegaOctets: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Comportement du swap (MemorySwappiness)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_SWAPPINESS} />
        <input
          value={etat.swappiness}
          onChange={(e) => majEtat({ swappiness: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <div style={{ marginBottom: 10 }}>
        <span style={styleTitreChampCreation}>Désactiver le tueur mémoire du noyau (OomKillDisable)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_OOM_KILL_DESACTIVE} />
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={etat.oomKillDesactive}
            onChange={(e) => majEtat({ oomKillDesactive: e.target.checked })}
          />{" "}
          Ne pas tuer le processus en surconsommation mémoire
        </label>
      </div>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Priorité face au tueur OOM (OomScoreAdj)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_OOM_SCORE_ADJ} />
        <input
          value={etat.oomScoreAdj}
          onChange={(e) => majEtat({ oomScoreAdj: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Pondération E/S disque (BlkioWeight)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_BLKIO_WEIGHT} />
        <input
          value={etat.blkioWeight}
          onChange={(e) => majEtat({ blkioWeight: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Groupe cgroup parent (CgroupParent)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_CGROUP_PARENT} />
        <input
          value={etat.cgroupParent}
          onChange={(e) => majEtat({ cgroupParent: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Pilote de volume par défaut (VolumeDriver)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_PILOTE_VOLUME} />
        <input
          value={etat.piloteVolume}
          onChange={(e) => majEtat({ piloteVolume: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Réutiliser les montages d’un autre conteneur (VolumesFrom)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_VOLUMES_FROM} />
        <textarea
          value={etat.volumesFromLignes}
          onChange={(e) => majEtat({ volumesFromLignes: e.target.value })}
          rows={3}
          style={{ ...styleChampTexteCreation, minHeight: "3rem" }}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Règles d’accès aux périphériques (DeviceCgroupRules)</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_DEVICE_CGROUP_RULES} />
        <textarea
          value={etat.deviceCgroupRulesLignes}
          onChange={(e) => majEtat({ deviceCgroupRulesLignes: e.target.value })}
          rows={3}
          style={{ ...styleChampTexteCreation, minHeight: "3rem" }}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Console TTY : hauteur en lignes</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_CONSOLE_HAUTEUR} />
        <input
          value={etat.consoleHauteur}
          onChange={(e) => majEtat({ consoleHauteur: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Console TTY : largeur en colonnes</span>
        <TexteAideChampCreationConteneurLab texte={Aides.AIDE_CONSOLE_LARGEUR} />
        <input
          value={etat.consoleLargeur}
          onChange={(e) => majEtat({ consoleLargeur: e.target.value })}
          style={styleChampTexteCreation}
        />
      </label>
    </SegmentRepliableCreationKidoPanel>
  );
}
