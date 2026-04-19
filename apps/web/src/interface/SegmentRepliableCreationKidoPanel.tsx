import { useId, useState, type ReactNode } from "react";

export type VarianteSegmentCreationKidoPanel = "neutre" | "accent";

type Props = {
  readonly titre: string;
  readonly sousTitre?: string;
  /** Premier rendu ouvert : utile pour les blocs que la majorité des opérateurs déploie souvent. */
  readonly defautOuvert?: boolean;
  readonly variante?: VarianteSegmentCreationKidoPanel;
  readonly children: ReactNode;
};

/**
 * Panneau repliable accessible pour regrouper les champs du formulaire de création,
 * sans l’apparence native du couple details ou summary du navigateur.
 */
export function SegmentRepliableCreationKidoPanel({
  titre,
  sousTitre,
  defautOuvert = false,
  variante = "neutre",
  children,
}: Props) {
  const [ouvert, setOuvert] = useState(defautOuvert);
  const idCorps = useId();
  const classeSegment = `kp-creation-segment kp-creation-segment--${variante}`;

  return (
    <div className={classeSegment}>
      <button
        type="button"
        className="kp-creation-segment__entete"
        aria-expanded={ouvert}
        aria-controls={idCorps}
        onClick={() => {
          setOuvert((v) => !v);
        }}
      >
        <span className="kp-creation-segment__chevron" aria-hidden />
        <span className="kp-creation-segment__titres">
          <span className="kp-creation-segment__titre">{titre}</span>
          {sousTitre !== undefined && sousTitre.length > 0 ? (
            <span className="kp-creation-segment__sous">{sousTitre}</span>
          ) : null}
        </span>
      </button>
      <div
        id={idCorps}
        className="kp-creation-segment__corps"
        hidden={!ouvert}
      >
        {children}
      </div>
    </div>
  );
}
