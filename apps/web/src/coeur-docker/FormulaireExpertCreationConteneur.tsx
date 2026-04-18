import type { EtatFormulaireExpertConteneur } from "./etat-formulaire-expert-conteneur.js";
import { FormulaireExpertSectionsDynamiquesConteneur } from "./FormulaireExpertSectionsDynamiquesConteneur.js";
import { SectionReseauEtSuggestionFormulaireExpert } from "./SectionReseauEtSuggestionFormulaireExpert.js";

type PropsFormulaireExpertCreationConteneur = {
  etat: EtatFormulaireExpertConteneur;
  surChangement: (suivant: EtatFormulaireExpertConteneur) => void;
  libelleSoumission: string;
  enCours: boolean;
  messageErreur: string | null;
  surSoumettre: () => void;
};

/**
 * Formulaire Docker structuré par sections repliables : identité, ports, variables, volumes,
 * ressources, réseau et paramètres avancés (sans zone JSON libre).
 */
export function FormulaireExpertCreationConteneur({
  etat,
  surChangement,
  libelleSoumission,
  enCours,
  messageErreur,
  surSoumettre,
}: PropsFormulaireExpertCreationConteneur) {
  return (
    <form
      className="form-auth-kido"
      onSubmit={(ev) => {
        ev.preventDefault();
        surSoumettre();
      }}
    >
      <fieldset className="kp-fieldset-section">
        <legend>Identité</legend>
        <div className="kp-champ">
          <label className="kp-champ__label kp-champ__label--requis" htmlFor="kp-exp-nom">
            Nom du container
          </label>
          <input
            id="kp-exp-nom"
            type="text"
            value={etat.nomContainer}
            onChange={(e) =>
              surChangement({ ...etat, nomContainer: e.target.value })
            }
            required
          />
        </div>
        <div className="kp-champ">
          <label className="kp-champ__label kp-champ__label--requis" htmlFor="kp-exp-img">
            Image Docker
          </label>
          <input
            id="kp-exp-img"
            type="text"
            placeholder="ex. nginx:alpine"
            value={etat.imageDocker}
            onChange={(e) =>
              surChangement({ ...etat, imageDocker: e.target.value })
            }
            required
          />
          <p className="kp-champ__aide">Référence complète telle que le démon Docker la tire.</p>
        </div>
        <div className="kp-champ">
          <label className="kp-champ__label" htmlFor="kp-exp-cmd">
            Commande de démarrage
          </label>
          <input
            id="kp-exp-cmd"
            type="text"
            placeholder="Arguments séparés par des espaces"
            value={etat.commandeDemarrage}
            onChange={(e) =>
              surChangement({ ...etat, commandeDemarrage: e.target.value })
            }
          />
        </div>
      </fieldset>

      <SectionReseauEtSuggestionFormulaireExpert etat={etat} surChangement={surChangement} />

      <FormulaireExpertSectionsDynamiquesConteneur
        etat={etat}
        surChangement={surChangement}
      />

      <details className="kp-details-section">
        <summary>Ressources</summary>
        <div className="kp-details-section__corps">
          <div className="kp-champ">
            <label className="kp-champ__label" htmlFor="kp-exp-mem">
              Mémoire (Mo)
            </label>
            <input
              id="kp-exp-mem"
              type="number"
              min={32}
              max={524288}
              value={etat.memoireMo}
              onChange={(e) =>
                surChangement({
                  ...etat,
                  memoireMo: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="kp-champ">
            <label className="kp-champ__label" htmlFor="kp-exp-cpu">
              CPU (cœurs)
            </label>
            <input
              id="kp-exp-cpu"
              type="number"
              min={0.25}
              max={512}
              step={0.25}
              value={etat.cpuCoeurs}
              onChange={(e) =>
                surChangement({
                  ...etat,
                  cpuCoeurs: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="kp-champ">
            <label className="kp-champ__label" htmlFor="kp-exp-res">
              Politique de redémarrage
            </label>
            <select
              id="kp-exp-res"
              value={etat.politiqueRedemarrage}
              onChange={(e) =>
                surChangement({
                  ...etat,
                  politiqueRedemarrage: e.target.value as EtatFormulaireExpertConteneur["politiqueRedemarrage"],
                })
              }
            >
              <option value="no">Jamais</option>
              <option value="always">Toujours</option>
              <option value="on-failure">Si erreur</option>
              <option value="unless-stopped">Sauf si arrêté manuellement</option>
            </select>
          </div>
        </div>
      </details>

      <details className="kp-details-section">
        <summary>Mode privilégié et limites PID</summary>
        <div className="kp-details-section__corps">
          <div className="kp-champ kp-champ--horizontal">
            <label className="kp-champ__label" htmlFor="kp-exp-priv">
              Mode privilégié
            </label>
            <input
              id="kp-exp-priv"
              type="checkbox"
              checked={etat.modePrivilegie}
              onChange={(e) =>
                surChangement({ ...etat, modePrivilegie: e.target.checked })
              }
            />
          </div>
          <div className="kp-champ">
            <label className="kp-champ__label" htmlFor="kp-exp-pid">
              Limite de processus (PID)
            </label>
            <input
              id="kp-exp-pid"
              type="number"
              min={1}
              placeholder="Laisser vide pour défaut Docker"
              value={etat.limitePid}
              onChange={(e) =>
                surChangement({ ...etat, limitePid: e.target.value })
              }
            />
          </div>
        </div>
      </details>

      {messageErreur !== null ? (
        <div className="bandeau-erreur-auth" role="alert">
          {messageErreur}
        </div>
      ) : null}

      <button type="submit" className="bouton-principal-kido" disabled={enCours}>
        {enCours ? "Création…" : libelleSoumission}
      </button>
    </form>
  );
}
