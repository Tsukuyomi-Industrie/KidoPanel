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

function libelleTypeJeuRecapitulatif(
  modePersonnalise: boolean,
  gabaritChoisi: GabaritJeuCatalogueInstance | null,
): string {
  if (modePersonnalise) return "Personnalisé (CUSTOM)";
  if (gabaritChoisi !== null) return gabaritChoisi.name;
  return "—";
}

function libelleDelaiInstallationRecapitulatif(
  modePersonnalise: boolean,
  gabaritChoisi: GabaritJeuCatalogueInstance | null,
): string {
  if (modePersonnalise) return "~2 min";
  if (gabaritChoisi !== null) {
    return formaterDelaiInstallation(gabaritChoisi.installTimeEstimateSeconds);
  }
  return "—";
}

type PropsEtapeConfirmation = {
  readonly modePersonnalise: boolean;
  readonly gabaritChoisi: GabaritJeuCatalogueInstance | null;
  readonly nomAffiche: string;
  readonly memoireMb: number;
  readonly cpuCores: number;
  readonly diskGb: number;
  readonly erreur: string | null;
  readonly enCours: boolean;
  readonly secondesInstallationAffichees: number | null;
  readonly surLancer: () => void;
};

/**
 * Étape 3 : récapitulatif lisible et lancement de l'installation.
 */
export function EtapeConfirmationCreationServeur({
  modePersonnalise,
  gabaritChoisi,
  nomAffiche,
  memoireMb,
  cpuCores,
  diskGb,
  erreur,
  enCours,
  secondesInstallationAffichees,
  surLancer,
}: PropsEtapeConfirmation) {
  const portIndicatif =
    gabaritChoisi === null || gabaritChoisi.defaultPorts.length === 0
      ? null
      : gabaritChoisi.defaultPorts[0];

  return (
    <section className="kidopanel-carte-principale" style={{ marginTop: "1rem" }}>
      <h1 className="kidopanel-titre-page">Confirmation</h1>
      <ul className="kp-liste-recap-creation" style={{ lineHeight: 1.7 }}>
        <li>
          <strong>Jeu : </strong>
          {libelleTypeJeuRecapitulatif(modePersonnalise, gabaritChoisi)}
        </li>
        <li>
          <strong>Nom du serveur : </strong>
          {nomAffiche.trim()}
        </li>
        <li>
          <strong>Ressources : </strong>
          {memoireVersGo(memoireMb)} RAM / {String(cpuCores)} cœur
          {cpuCores === 1 ? "" : "s"} / {String(diskGb)} Go disque
        </li>
        <li>
          <strong>Port de jeu : </strong>
          {portIndicatif === null
            ? "attribué par le service"
            : `${String(portIndicatif)} (publié automatiquement par le service)`}
        </li>
        <li>
          <strong>Durée d'installation estimée : </strong>
          {libelleDelaiInstallationRecapitulatif(modePersonnalise, gabaritChoisi)}
        </li>
      </ul>
      {erreur !== null ? (
        <div className="bandeau-erreur-auth" role="alert">
          {erreur}
        </div>
      ) : null}
      {enCours ? (
        <output className="kidopanel-texte-muted" style={{ display: "block" }}>
          Installation en cours…
          {secondesInstallationAffichees !== null && secondesInstallationAffichees > 0
            ? ` Temps restant indicatif : ${String(secondesInstallationAffichees)} s`
            : null}
        </output>
      ) : (
        <button type="button" className="bouton-principal-kido" onClick={surLancer}>
          Lancer l'installation
        </button>
      )}
    </section>
  );
}
