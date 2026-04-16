import type { EtatCreationConteneurLab } from "./etatCreationConteneurLab.js";
import {
  styleChampTexteCreation,
  styleLabelChampCreation,
} from "./stylesFormulaireCreationConteneurLab.js";

type Props = {
  etat: EtatCreationConteneurLab;
  majEtat: (partiel: Partial<EtatCreationConteneurLab>) => void;
};

/** Sécurité, ressources, TTY, stdin et blocs JSON avancés (healthcheck, réseau, host). */
export function BlocSecuriteRessourcesEtJsonCreationConteneurLab({
  etat,
  majEtat,
}: Props) {
  return (
    <>
      <details style={{ marginBottom: 10 }}>
        <summary>Sécurité et capacités</summary>
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={etat.privileged}
            onChange={(e) => majEtat({ privileged: e.target.checked })}
          />
          Privilégié
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={etat.racineLectureSeule}
            onChange={(e) => majEtat({ racineLectureSeule: e.target.checked })}
          />
          Racine en lecture seule
        </label>
        <label style={styleLabelChampCreation}>
          Capacités à ajouter (virgules)
          <input
            value={etat.capacitesAjout}
            onChange={(e) => majEtat({ capacitesAjout: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          Capacités à retirer (virgules)
          <input
            value={etat.capacitesRetrait}
            onChange={(e) => majEtat({ capacitesRetrait: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          Options de sécurité (virgules, ex. no-new-privileges)
          <input
            value={etat.optionsSecurite}
            onChange={(e) => majEtat({ optionsSecurite: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
      </details>

      <details style={{ marginBottom: 10 }}>
        <summary>Ressources et redémarrage</summary>
        <label style={styleLabelChampCreation}>
          Limite mémoire (Mo, nombre entier)
          <input
            value={etat.memoireMegaOctets}
            onChange={(e) => majEtat({ memoireMegaOctets: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          Nano CPUs (quota Docker, entier positif)
          <input
            value={etat.nanoCpus}
            onChange={(e) => majEtat({ nanoCpus: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          Politique de redémarrage
          <select
            value={etat.politiqueRedemarrage}
            onChange={(e) =>
              majEtat({
                politiqueRedemarrage: e.target.value as EtatCreationConteneurLab["politiqueRedemarrage"],
              })
            }
            style={styleChampTexteCreation}
          >
            <option value="">(par défaut moteur / image)</option>
            <option value="no">no</option>
            <option value="always">always</option>
            <option value="on-failure">on-failure</option>
            <option value="unless-stopped">unless-stopped</option>
          </select>
        </label>
        {etat.politiqueRedemarrage === "on-failure" ? (
          <label style={styleLabelChampCreation}>
            Tentatives max (on-failure)
            <input
              value={etat.tentativesMaxOnFailure}
              onChange={(e) => majEtat({ tentativesMaxOnFailure: e.target.value })}
              style={styleChampTexteCreation}
            />
          </label>
        ) : null}
      </details>

      <details style={{ marginBottom: 10 }}>
        <summary>TTY et entrée standard</summary>
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={etat.tty}
            onChange={(e) => majEtat({ tty: e.target.checked })}
          />
          Allouer un TTY
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={etat.entreeStandardOuverte}
            onChange={(e) => majEtat({ entreeStandardOuverte: e.target.checked })}
          />
          Ouvrir stdin
        </label>
      </details>

      <details style={{ marginBottom: 10 }}>
        <summary>JSON avancé (healthcheck, réseau nommé, hostConfig)</summary>
        <label style={styleLabelChampCreation}>
          Healthcheck (objet JSON, ex. test en secondes)
          <textarea
            value={etat.jsonHealthcheck}
            onChange={(e) => majEtat({ jsonHealthcheck: e.target.value })}
            rows={5}
            placeholder='{"test":["CMD-SHELL","curl -f http://127.0.0.1/ || exit 1"],"intervalSeconds":10}'
            style={{ ...styleChampTexteCreation, minHeight: "5rem" }}
          />
        </label>
        <label style={styleLabelChampCreation}>
          NetworkingConfig (objet JSON, ex. endpointsConfig)
          <textarea
            value={etat.jsonConfigurationReseau}
            onChange={(e) => majEtat({ jsonConfigurationReseau: e.target.value })}
            rows={5}
            placeholder='{"endpointsConfig":{"mon_reseau":{"aliases":["web1"]}}}'
            style={{ ...styleChampTexteCreation, minHeight: "5rem" }}
          />
        </label>
        <label style={styleLabelChampCreation}>
          HostConfig additionnel (objet JSON fusionné avec les champs ci-dessus)
          <textarea
            value={etat.jsonHostConfigExtra}
            onChange={(e) => majEtat({ jsonHostConfigExtra: e.target.value })}
            rows={6}
            placeholder='{"ulimits":[{"name":"nofile","soft":64000,"hard":64000}]}'
            style={{ ...styleChampTexteCreation, minHeight: "6rem" }}
          />
        </label>
      </details>
    </>
  );
}
