type PropsBarreRessource = {
  readonly etiquette: string;
  readonly valeurTexte: string;
  /** Part remplie entre 0 et 100 ; absent si aucune mesure temps réel. */
  readonly pourcentage?: number;
  readonly variante: "ram" | "cpu";
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
  const classeAvancement =
    variante === "ram"
      ? "kp-barre-ressource__avancement kp-barre-ressource__avancement--ram"
      : "kp-barre-ressource__avancement kp-barre-ressource__avancement--cpu";

  return (
    <div className="kp-barre-ressource">
      <div className="kp-barre-ressource__entete">
        <span>{etiquette}</span>
        <span>{valeurTexte}</span>
      </div>
      <progress
        className={classeAvancement}
        max={100}
        value={largeur}
        aria-label={`${etiquette} · ${valeurTexte}`}
      />
    </div>
  );
}
