import type { GabaritJeuCatalogueInstance } from "@kidopanel/container-catalog";

function memoireVersGo(mb: number): string {
  if (mb >= 1024) {
    const go = mb / 1024;
    const arrondi = Number.isInteger(go) ? String(go) : go.toFixed(1);
    return `${arrondi} Go`;
  }
  return `${String(mb)} Mo`;
}

function formaterDelaiInstallation(secondes: number): string {
  if (secondes < 60) {
    return `~${String(secondes)} s`;
  }
  return `~${String(Math.ceil(secondes / 60))} min`;
}

type PropsEtapeListeJeux = {
  readonly gabarits: readonly GabaritJeuCatalogueInstance[];
  readonly surChoisirJeu: (g: GabaritJeuCatalogueInstance) => void;
  readonly surChoisirPersonnalise: () => void;
};

/**
 * Étape 1 : grille de jeux et carte « Personnalisé ».
 */
export function EtapeListeJeuxCreationServeur({
  gabarits,
  surChoisirJeu,
  surChoisirPersonnalise,
}: PropsEtapeListeJeux) {
  return (
    <>
      <h1 className="kidopanel-titre-page">Choisir un jeu</h1>
      <p className="kidopanel-sous-titre-page">
        Sélectionnez le titre à héberger ; le panel appliquera la configuration adaptée.
      </p>
      <div className="kp-grille-cartes-gabarits kp-marges-haut-sm">
        {gabarits.map((g) => (
          <article key={g.id} className="kp-carte-selection-gabarit">
            <span className="kp-carte-selection-gabarit__icone" aria-hidden="true">
              {g.iconeRepresentation}
            </span>
            <span className="kp-carte-selection-gabarit__badge">{g.etiquetteBadgeUx}</span>
            <h2 className="kp-creation-catalogue-fiche__id">{g.name}</h2>
            <p className="kp-texte-muted">{g.description}</p>
            <p className="kp-texte-muted">
              {memoireVersGo(g.defaultMemoryMb)} RAM recommandés ·{" "}
              {formaterDelaiInstallation(g.installTimeEstimateSeconds)} d'installation estimée
            </p>
            {g.id === "tmpl-jeu-minecraft-java" ? (
              <p className="kp-mention-legale-minecraft">
                En créant ce serveur, vous acceptez le CLUF Minecraft de Microsoft.
              </p>
            ) : null}
            <button
              type="button"
              className="bouton-principal-kido"
              onClick={() => surChoisirJeu(g)}
            >
              Choisir
            </button>
          </article>
        ))}
        <article className="kp-carte-selection-gabarit">
          <span className="kp-carte-selection-gabarit__icone" aria-hidden="true">
            ✎
          </span>
          <span className="kp-carte-selection-gabarit__badge">Avancé</span>
          <h2 className="kp-creation-catalogue-fiche__id">Personnalisé</h2>
          <p className="kp-texte-muted">
            Quotas uniquement : nom, mémoire, processeur et disque. À utiliser si votre jeu n'est pas
            listé.
          </p>
          <button type="button" className="bouton-principal-kido" onClick={surChoisirPersonnalise}>
            Choisir
          </button>
        </article>
      </div>
    </>
  );
}
