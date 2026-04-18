import type { ChampGabaritDockerRapide } from "@kidopanel/container-catalog";
import type { GabaritJeuCatalogueInstance } from "@kidopanel/container-catalog";
import { FormulaireGabarit } from "../interface/FormulaireGabarit.js";
import { BlocChoixReseauCreationServeur } from "./BlocChoixReseauCreationServeur.js";
import type { StrategieReseauCreationInstanceJeux } from "./traducteur-formulaire-vers-api.js";

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

export function construireValeursInitialesDepuisChamps(
  champs: readonly ChampGabaritDockerRapide[],
): Record<string, string> {
  const sortie: Record<string, string> = {};
  for (const champ of champs) {
    sortie[champ.cle] = champ.defaut ?? "";
  }
  return sortie;
}

const PRESETS_MEMOIRE_MO = [1024, 2048, 4096, 8192] as const;
const PRESETS_CPU = [0.5, 1, 2, 4] as const;

type PropsEtapeConfiguration = {
  messageErreur: string | null;
  modePersonnalise: boolean;
  gabaritChoisi: GabaritJeuCatalogueInstance | null;
  nomAffiche: string;
  surNomAffiche: (v: string) => void;
  memoireMb: number;
  surMemoireMb: (v: number) => void;
  cpuCores: number;
  surCpuCores: (v: number) => void;
  diskGb: number;
  surDiskGb: (v: number) => void;
  valeursInitialesFormulaire: Record<string, string>;
  surContinuerAvecFormulaire: (valeurs: Record<string, string>) => void;
  surContinuerPersonnalise: () => void;
  strategieReseau: StrategieReseauCreationInstanceJeux;
  surStrategieReseau: (v: StrategieReseauCreationInstanceJeux) => void;
  idReseauInterneSelectionne: string;
  surIdReseauInterneSelectionne: (id: string) => void;
  primaireReseauKidopanel: boolean;
  surPrimaireReseauKidopanel: (v: boolean) => void;
};

/**
 * Étape 2 : nom, quotas et paramètres métiers via {@link FormulaireGabarit}.
 */
export function EtapeConfigurationCreationServeur({
  messageErreur,
  modePersonnalise,
  gabaritChoisi,
  nomAffiche,
  surNomAffiche,
  memoireMb,
  surMemoireMb,
  cpuCores,
  surCpuCores,
  diskGb,
  surDiskGb,
  valeursInitialesFormulaire,
  surContinuerAvecFormulaire,
  surContinuerPersonnalise,
  strategieReseau,
  surStrategieReseau,
  idReseauInterneSelectionne,
  surIdReseauInterneSelectionne,
  primaireReseauKidopanel,
  surPrimaireReseauKidopanel,
}: PropsEtapeConfiguration) {
  return (
    <section className="kidopanel-carte-principale" style={{ marginTop: "1rem" }}>
      {messageErreur !== null ? (
        <div className="bandeau-erreur-auth" role="alert">
          {messageErreur}
        </div>
      ) : null}
      <h1 className="kidopanel-titre-page" style={{ marginTop: "0.75rem" }}>
        Configuration
      </h1>
      {gabaritChoisi !== null && !modePersonnalise ? (
        <p className="kidopanel-sous-titre-page">
          {gabaritChoisi.name} · installation typique{" "}
          {formaterDelaiInstallation(gabaritChoisi.installTimeEstimateSeconds)}
        </p>
      ) : (
        <p className="kidopanel-sous-titre-page">Serveur personnalisé (type CUSTOM).</p>
      )}

      <div className="kp-champ">
        <label className="kp-champ__label kp-champ__label--requis" htmlFor="kp-nom-srv">
          Nom du serveur (affiché dans le panel)
        </label>
        <input
          id="kp-nom-srv"
          type="text"
          value={nomAffiche}
          onChange={(e) => surNomAffiche(e.target.value)}
          required
        />
      </div>

      <div className="kp-champ">
        <span className="kp-champ__label">Mémoire vive</span>
        <p className="kp-champ__aide">
          Recommandé :{" "}
          {gabaritChoisi !== null && !modePersonnalise
            ? memoireVersGo(gabaritChoisi.defaultMemoryMb)
            : "2 Go"}
        </p>
        <div className="kp-presets-memoire">
          {PRESETS_MEMOIRE_MO.map((m) => (
            <button
              key={m}
              type="button"
              className="bouton-secondaire-kido"
              onClick={() => surMemoireMb(m)}
            >
              {memoireVersGo(m)}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={256}
          max={524288}
          value={memoireMb}
          onChange={(e) => surMemoireMb(Number(e.target.value))}
          style={{ marginTop: "0.5rem", maxWidth: "12rem" }}
        />
      </div>

      <div className="kp-champ">
        <span className="kp-champ__label">Processeur (cœurs)</span>
        <div className="kp-presets-memoire">
          {PRESETS_CPU.map((c) => (
            <button
              key={c}
              type="button"
              className="bouton-secondaire-kido"
              onClick={() => surCpuCores(c)}
            >
              {String(c)} cœur{c === 1 ? "" : "s"}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={0.25}
          max={512}
          step={0.25}
          value={cpuCores}
          onChange={(e) => surCpuCores(Number(e.target.value))}
          style={{ marginTop: "0.5rem", maxWidth: "12rem" }}
        />
      </div>

      <div className="kp-champ">
        <label className="kp-champ__label" htmlFor="kp-disk">
          Espace disque (Go)
        </label>
        <input
          id="kp-disk"
          type="number"
          min={1}
          max={10000}
          value={diskGb}
          onChange={(e) => surDiskGb(Number(e.target.value))}
        />
      </div>

      <BlocChoixReseauCreationServeur
        strategie={strategieReseau}
        surStrategie={surStrategieReseau}
        idReseauSelectionne={idReseauInterneSelectionne}
        surIdReseauSelectionne={surIdReseauInterneSelectionne}
        primaireKidopanel={primaireReseauKidopanel}
        surPrimaireKidopanel={surPrimaireReseauKidopanel}
      />

      {gabaritChoisi !== null && !modePersonnalise ? (
        <FormulaireGabarit
          champs={gabaritChoisi.champsFormulaire}
          valeursInitiales={valeursInitialesFormulaire}
          libelleAction="Continuer vers la confirmation"
          enCours={false}
          messageErreur={null}
          onSubmit={surContinuerAvecFormulaire}
        />
      ) : (
        <div style={{ marginTop: "1rem" }}>
          <button type="button" className="bouton-principal-kido" onClick={surContinuerPersonnalise}>
            Continuer vers la confirmation
          </button>
        </div>
      )}
    </section>
  );
}
