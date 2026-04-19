import type { InstanceServeurJeuxPasserelle } from "../../passerelle/serviceServeursJeuxPasserelle.js";
import {
  arreterInstanceServeur,
  demarrerInstanceServeur,
  redemarrerInstanceServeur,
} from "../passerelle/actionsInstanceServeurPasserelle.js";

type PropsBarrePilotageDetailServeur = {
  readonly instance: InstanceServeurJeuxPasserelle;
  readonly statut: string;
  readonly transition: boolean;
  readonly patient: boolean;
  readonly libelleStatutPilotage: (s: string) => string;
  readonly executerAction: (libelleSucces: string, fn: () => Promise<void>) => Promise<void>;
  readonly ouvrirSuppression: () => void;
};

/**
 * Boutons contextuels (démarrage, arrêt, redémarrage, suppression) pour le résumé instance jeu.
 */
export function BarrePilotageDetailServeur({
  instance,
  statut,
  transition,
  patient,
  libelleStatutPilotage,
  executerAction,
  ouvrirSuppression,
}: PropsBarrePilotageDetailServeur) {
  return (
    <div
      className="kp-marges-haut-sm"
      style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
    >
      {transition ? (
        <span className="kp-texte-muted">{libelleStatutPilotage(statut)}</span>
      ) : null}
      {!transition && statut === "STOPPED" ? (
        <>
          <button
            type="button"
            className="kp-btn kp-btn--primaire"
            disabled={patient}
            onClick={() =>
              executerAction("Démarrage demandé.", () => demarrerInstanceServeur(instance.id)).catch(() => {})
            }
          >
            Démarrer
          </button>
          <button
            type="button"
            className="kp-btn kp-btn--danger"
            disabled={patient}
            onClick={ouvrirSuppression}
          >
            Supprimer
          </button>
        </>
      ) : null}
      {!transition && statut === "RUNNING" ? (
        <>
          <button
            type="button"
            className="kp-btn kp-btn--danger"
            disabled={patient}
            onClick={() =>
              executerAction("Arrêt demandé.", () => arreterInstanceServeur(instance.id)).catch(() => {})
            }
          >
            Arrêter
          </button>
          <button
            type="button"
            className="kp-btn kp-btn--secondaire"
            disabled={patient}
            onClick={() =>
              executerAction("Redémarrage demandé.", () =>
                redemarrerInstanceServeur(instance.id),
              ).catch(() => {})
            }
          >
            Redémarrer
          </button>
        </>
      ) : null}
      {!transition && statut === "CRASHED" ? (
        <>
          <button
            type="button"
            className="kp-btn kp-btn--secondaire"
            disabled={patient}
            onClick={() =>
              executerAction("Redémarrage demandé.", () =>
                redemarrerInstanceServeur(instance.id),
              ).catch(() => {})
            }
          >
            Redémarrer
          </button>
          <button
            type="button"
            className="kp-btn kp-btn--danger"
            disabled={patient}
            onClick={ouvrirSuppression}
          >
            Supprimer
          </button>
        </>
      ) : null}
      {!transition &&
      statut !== "INSTALLING" &&
      statut !== "STOPPED" &&
      statut !== "RUNNING" &&
      statut !== "CRASHED" ? (
        <button
          type="button"
          className="kp-btn kp-btn--danger"
          disabled={patient}
          onClick={ouvrirSuppression}
        >
          Supprimer
        </button>
      ) : null}
    </div>
  );
}
