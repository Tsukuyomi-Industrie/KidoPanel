import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

type PropsConsoleFluxInstance = {
  readonly titre: string;
  /** Lignes issues du flux SSE Docker (journaux conteneur). */
  readonly lignes: string[];
  readonly etatConnexion: string;
  readonly dernierMessageErreur: string | null;
  readonly surEffacerFlux: () => void;
  /** Sorties agrégées des appels `exec` (distinctes des journaux). */
  readonly lignesSortieExec?: string[];
  readonly modeSaisieExec?: boolean;
  readonly surEnvoyerLigneCommande?: (ligne: string) => void | Promise<void>;
  readonly chargementExec?: boolean;
  readonly erreurExecSaisie?: string | null;
  readonly surEffacerSortiesExec?: () => void;
};

function clefLignesIncrementales(lignes: string[]): { cle: string; ligne: string }[] {
  const compteParLigne = new Map<string, number>();
  return lignes.map((ligne) => {
    const compteActuel = (compteParLigne.get(ligne) ?? 0) + 1;
    compteParLigne.set(ligne, compteActuel);
    return { cle: `${ligne}__${String(compteActuel)}`, ligne };
  });
}

/** Rendu mutualisé des consoles SSE d’instances (jeu et web) avec zone exec optionnelle. */
export function ConsoleFluxInstance({
  titre,
  lignes,
  etatConnexion,
  dernierMessageErreur,
  surEffacerFlux,
  lignesSortieExec = [],
  modeSaisieExec = false,
  surEnvoyerLigneCommande,
  chargementExec = false,
  erreurExecSaisie = null,
  surEffacerSortiesExec,
}: PropsConsoleFluxInstance) {
  const refFinLogs = useRef<HTMLDivElement>(null);
  const [ligneCourante, definirLigneCourante] = useState("");

  useEffect(() => {
    refFinLogs.current?.scrollIntoView({ behavior: "smooth" });
  }, [lignes]);

  const lignesFluxAvecCle = useMemo(() => clefLignesIncrementales(lignes), [lignes]);
  const lignesExecAvecCle = useMemo(
    () => clefLignesIncrementales(lignesSortieExec),
    [lignesSortieExec],
  );

  const soumettreCommande = async (evt: FormEvent): Promise<void> => {
    evt.preventDefault();
    if (
      modeSaisieExec !== true ||
      chargementExec === true ||
      surEnvoyerLigneCommande === undefined
    ) {
      return;
    }
    await surEnvoyerLigneCommande(ligneCourante);
    definirLigneCourante("");
  };

  return (
    <section className="kp-console-section">
      <p className="kp-console-meta">
        Flux journaux : <strong>{etatConnexion}</strong>
      </p>
      <div className="kp-console-wrapper">
        <div className="kp-console-barre">
          <div className="kp-console-barre__boutons" aria-hidden="true">
            <span className="kp-console-barre__rond kp-console-barre__rond--fermer" />
            <span className="kp-console-barre__rond kp-console-barre__rond--reduire" />
            <span className="kp-console-barre__rond kp-console-barre__rond--agrandir" />
          </div>
          <span className="kp-console-barre__titre">{titre}</span>
          <button type="button" className="kp-btn kp-btn--ghost kp-btn--sm" onClick={surEffacerFlux}>
            Effacer journaux
          </button>
        </div>
        <div className="kp-console-logs" role="log" aria-label="Journaux conteneur">
          {dernierMessageErreur === null ? null : (
            <p className="kp-log-ligne kp-log-error" role="alert">
              {dernierMessageErreur}
            </p>
          )}
          {lignes.length === 0 ? (
            <span className="kp-log-ligne kp-log-debug">— en attente de lignes —</span>
          ) : (
            lignesFluxAvecCle.map((entree) => (
              <div key={entree.cle} className="kp-log-ligne kp-log-info">
                {entree.ligne}
              </div>
            ))
          )}
          <div ref={refFinLogs} />
        </div>

        {modeSaisieExec === true ? (
          <div className="kp-console-exec-bloc">
            <div className="kp-console-barre">
              <span className="kp-console-barre__titre">Commandes (exec)</span>
              {surEffacerSortiesExec !== undefined ? (
                <button
                  type="button"
                  className="kp-btn kp-btn--ghost kp-btn--sm"
                  onClick={surEffacerSortiesExec}
                >
                  Effacer sorties commandes
                </button>
              ) : null}
            </div>
            <div
              className="kp-console-logs kp-console-logs--exec"
              role="log"
              aria-label="Sorties des commandes exécutées"
            >
              {erreurExecSaisie === null ? null : (
                <p className="kp-log-ligne kp-log-error" role="alert">
                  {erreurExecSaisie}
                </p>
              )}
              {lignesSortieExec.length === 0 ? (
                <span className="kp-log-ligne kp-log-debug">
                  Aucune commande envoyée pour l’instant.
                </span>
              ) : (
                lignesExecAvecCle.map((entree) => (
                  <div key={entree.cle} className="kp-log-ligne kp-log-info">
                    {entree.ligne}
                  </div>
                ))
              )}
            </div>
            <form className="kp-console-saisie" onSubmit={(e) => soumettreCommande(e).catch(() => {})}>
              <span className="kp-console-saisie__prompt">&gt;</span>
              <input
                className="kp-console-saisie__input"
                type="text"
                value={ligneCourante}
                onChange={(e) => definirLigneCourante(e.target.value)}
                disabled={chargementExec}
                placeholder="Commande shell dans le conteneur (Entrée pour envoyer)"
                aria-label="Saisie commande conteneur"
                autoComplete="off"
                spellCheck={false}
              />
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}
