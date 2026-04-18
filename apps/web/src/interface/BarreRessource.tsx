type PropsBarreRessource = {
  etiquette: string;
  valeurTexte: string;
  /** Part remplie entre 0 et 100 ; absent si aucune mesure temps réel. */
  pourcentage?: number;
  variante: "ram" | "cpu";
};

/** Barre de progression horizontale pour RAM ou CPU sur une carte serveur. */
export function BarreRessource({
  etiquette,
  valeurTexte,
  pourcentage,
  variante,
}: PropsBarreRessource) {
  const largeur =
    pourcentage === undefined ? 0 : Math.min(100, Math.max(0, pourcentage));
  const classeRemplissage =
    variante === "ram"
      ? "kp-barre-ressource__remplissage kp-barre-ressource__remplissage--ram"
      : "kp-barre-ressource__remplissage kp-barre-ressource__remplissage--cpu";

  return (
    <div className="kp-barre-ressource">
      <div className="kp-barre-ressource__entete">
        <span>{etiquette}</span>
        <span>{valeurTexte}</span>
      </div>
      <div className="kp-barre-ressource__piste" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={largeur}>
        <div className={classeRemplissage} style={{ width: `${String(largeur)}%` }} />
      </div>
    </div>
  );
}
