import type { ReactNode } from "react";

type PropsEtatVide = {
  readonly titre: string;
  readonly detail: string;
  readonly icone?: ReactNode;
};

/** Bloc centré pour les vues sans données ou les sections en attente de mise en service. */
export function EtatVide({ titre, detail, icone }: PropsEtatVide) {
  return (
    <div className="kp-etat-vide kp-panel-corps">
      {icone === undefined ? null : icone}
      <h2 className="kp-etat-vide__titre">{titre}</h2>
      <p className="kp-etat-vide__detail">{detail}</p>
    </div>
  );
}
