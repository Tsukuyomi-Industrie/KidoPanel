import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFluxJournauxConteneur } from "../hooks/useFluxJournauxConteneur.js";
import { enrichirTexteErreurPourAffichage } from "./passerelleErreursAffichageLab.js";
import {
  composerUrlPasserelle,
  urlBasePasserelle,
} from "./passerelleClient.js";

const VALEURS_TAIL: readonly number[] = [100, 200, 500, 1000, 5000];

type PropsSectionJournauxSseLab = {
  idSelectionne: string;
  jeton: string;
  fluxJournauxActif: boolean;
  setFluxJournauxActif: (actif: boolean) => void;
};

function resumeIdentifiant(id: string): string {
  const t = id.trim();
  if (t.length === 0) {
    return "aucun conteneur sélectionné";
  }
  if (t.length <= 18) {
    return t;
  }
  return `…${t.slice(-14)}`;
}

/**
 * Console de journaux : flux SSE, filtres et export ; panneau repliable pour libérer l’écran.
 */
export function SectionJournauxSseLab({
  idSelectionne,
  jeton,
  fluxJournauxActif,
  setFluxJournauxActif,
}: PropsSectionJournauxSseLab) {
  const [deplie, setDeplie] = useState(false);
  const [tailEntrees, setTailEntrees] = useState(500);
  const [horodatagesDocker, setHorodatagesDocker] = useState(true);
  const [retourALaLigne, setRetourALaLigne] = useState(true);
  const [filtreTexte, setFiltreTexte] = useState("");
  const [defilementAuto, setDefilementAuto] = useState(true);
  const refConteneurVue = useRef<HTMLPreElement>(null);
  const urlBaseMemoisee = useMemo(() => urlBasePasserelle(), []);

  const { lignes, etatConnexion, dernierMessageErreur, effacer } =
    useFluxJournauxConteneur({
      urlBasePasserelle: urlBaseMemoisee,
      idConteneur: idSelectionne,
      jetonBearer: jeton,
      actif: fluxJournauxActif,
      tailEntrees,
      horodatageDocker: horodatagesDocker,
      surFinFluxNaturelle: () => {
        setFluxJournauxActif(false);
      },
    });

  const lignesFiltrees = useMemo(() => {
    const q = filtreTexte.trim().toLowerCase();
    if (q === "") {
      return lignes;
    }
    return lignes.filter((l) => l.toLowerCase().includes(q));
  }, [lignes, filtreTexte]);

  const texteExport = useMemo(() => lignesFiltrees.join("\n"), [lignesFiltrees]);

  useLayoutEffect(() => {
    if (!defilementAuto || !refConteneurVue.current) {
      return;
    }
    const el = refConteneurVue.current;
    el.scrollTop = el.scrollHeight;
  }, [lignesFiltrees, defilementAuto, fluxJournauxActif]);

  const telechargerFichier = (): void => {
    const idCourt =
      idSelectionne.trim().length > 12
        ? idSelectionne.trim().slice(0, 12)
        : idSelectionne.trim() || "conteneur";
    const blob = new Blob([texteExport], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journaux-${idCourt}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copierPressePapiers = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(texteExport);
    } catch {
      /* presse-papiers indisponible : ignoré */
    }
  };

  return (
    <section className="kp-journaux" aria-label="Journaux conteneur">
      <button
        type="button"
        className="kp-journaux__deplier"
        aria-expanded={deplie}
        aria-label={deplie ? "Replier les journaux conteneur" : "Déplier les journaux conteneur"}
        onClick={() => {
          setDeplie((v) => !v);
        }}
      >
        <span className="kp-journaux__chevron" data-ouvert={deplie} aria-hidden="true" />
        <span className="kp-journaux__titre-bloc">Journaux conteneur</span>
        <span className="kp-journaux__resume" title={idSelectionne.trim() || undefined}>
          {resumeIdentifiant(idSelectionne)} · {etatConnexion}
          {lignes.length > 0 ? ` · ${String(lignes.length)} ligne(s)` : ""}
          {fluxJournauxActif ? " · flux ouvert" : ""}
        </span>
      </button>

      {deplie ? (
        <div className="kp-journaux__corps">
          <p className="kp-journaux__aide">
            Flux temps réel <code>…/logs/stream</code> (paramètre <code>tail</code> côté Docker). Fermeture
            automatique du flux lorsque le conteneur s’arrête ou que la connexion se termine.
          </p>

          <div className="kp-journaux__barre">
            <label>
              Lignes (tail)
              <select
                className="kp-journaux__select"
                value={tailEntrees}
                disabled={fluxJournauxActif}
                onChange={(e) => {
                  setTailEntrees(Number(e.target.value));
                }}
              >
                {VALEURS_TAIL.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={horodatagesDocker}
                disabled={fluxJournauxActif}
                onChange={(e) => {
                  setHorodatagesDocker(e.target.checked);
                }}
              />
              Horodatages Docker
            </label>
            <label>
              <input
                type="checkbox"
                checked={retourALaLigne}
                onChange={(e) => {
                  setRetourALaLigne(e.target.checked);
                }}
              />
              Retour à la ligne
            </label>
            <label>
              <input
                type="checkbox"
                checked={defilementAuto}
                onChange={(e) => {
                  setDefilementAuto(e.target.checked);
                }}
              />
              Défilement auto
            </label>
          </div>

          <div className="kp-journaux__barre">
            <input
              type="search"
              className="kp-journaux__champ kp-journaux__champ-recherche"
              placeholder="Filtrer les lignes…"
              value={filtreTexte}
              onChange={(e) => {
                setFiltreTexte(e.target.value);
              }}
            />
            <span className="kp-journaux__compteur">
              {String(lignesFiltrees.length)}/{String(lignes.length)} ligne(s)
            </span>
          </div>

          <div className="kp-journaux__actions">
            <button
              type="button"
              className="kp-journaux__btn kp-journaux__btn--primaire"
              disabled={!idSelectionne.trim()}
              onClick={() => {
                setFluxJournauxActif(true);
              }}
            >
              Ouvrir le flux
            </button>
            <button
              type="button"
              className="kp-journaux__btn"
              onClick={() => {
                setFluxJournauxActif(false);
              }}
            >
              Fermer le flux
            </button>
            <button type="button" className="kp-journaux__btn" onClick={effacer}>
              Effacer
            </button>
            <button
              type="button"
              className="kp-journaux__btn"
              disabled={lignesFiltrees.length === 0}
              onClick={() => {
                void copierPressePapiers();
              }}
            >
              Copier
            </button>
            <button
              type="button"
              className="kp-journaux__btn"
              disabled={lignesFiltrees.length === 0}
              onClick={telechargerFichier}
            >
              Télécharger .txt
            </button>
          </div>

          <p className="kp-journaux__etat">
            Connexion : <strong>{etatConnexion}</strong>
            {fluxJournauxActif ? (
              <span> — modifier tail ou horodatages : fermer le flux d’abord</span>
            ) : null}
          </p>

          {dernierMessageErreur ? (
            <pre className="kp-journaux__erreur" role="status">
              {enrichirTexteErreurPourAffichage(
                dernierMessageErreur,
                idSelectionne.trim() === ""
                  ? `${urlBasePasserelle()}/containers/…/logs/stream`
                  : composerUrlPasserelle(
                      `/containers/${encodeURIComponent(idSelectionne.trim())}/logs/stream`,
                    ),
              )}
            </pre>
          ) : null}

          <pre
            ref={refConteneurVue}
            className={`kp-journaux__vue ${retourALaLigne ? "kp-journaux__vue--wrap" : "kp-journaux__vue--nowrap"}`}
          >
            {lignesFiltrees.join("\n")}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
