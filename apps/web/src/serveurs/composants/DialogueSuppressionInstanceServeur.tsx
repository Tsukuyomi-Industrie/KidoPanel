import type { RefObject } from "react";

type PropsDialogueSuppressionInstanceServeur = {
  readonly refDialogue: RefObject<HTMLDialogElement | null>;
  readonly patient: boolean;
  readonly surAnnuler: () => void;
  readonly surConfirmer: () => void;
};

/**
 * Fenêtre modale de confirmation avant suppression définitive d’une instance jeu.
 */
export function DialogueSuppressionInstanceServeur({
  refDialogue,
  patient,
  surAnnuler,
  surConfirmer,
}: PropsDialogueSuppressionInstanceServeur) {
  return (
    <dialog
      ref={refDialogue}
      style={{
        maxWidth: "24rem",
        border: "1px solid var(--kp-bordure, #333)",
        padding: "1rem",
      }}
    >
      <p>Supprimer définitivement cette instance et son conteneur ? Action irréversible.</p>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          justifyContent: "flex-end",
          marginTop: "1rem",
        }}
      >
        <button type="button" className="kp-btn kp-btn--ghost" onClick={surAnnuler}>
          Annuler
        </button>
        <button
          type="button"
          className="kp-btn kp-btn--danger"
          disabled={patient}
          onClick={() => surConfirmer()}
        >
          Supprimer
        </button>
      </div>
    </dialog>
  );
}
