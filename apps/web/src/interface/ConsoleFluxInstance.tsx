import { useEffect, useMemo, useRef } from "react";

type PropsConsoleFluxInstance = {
  readonly titre: string;
  readonly lignes: string[];
  readonly etatConnexion: string;
  readonly dernierMessageErreur: string | null;
  readonly surEffacer: () => void;
};

/** Rendu mutualisé des consoles SSE d’instances (jeu et web). */
export function ConsoleFluxInstance({
  titre,
  lignes,
  etatConnexion,
  dernierMessageErreur,
  surEffacer,
}: PropsConsoleFluxInstance) {
  const refFinLogs = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refFinLogs.current?.scrollIntoView({ behavior: "smooth" });
  }, [lignes]);

  const lignesAvecCle = useMemo(() => {
    const compteParLigne = new Map<string, number>();
    return lignes.map((ligne) => {
      const compteActuel = (compteParLigne.get(ligne) ?? 0) + 1;
      compteParLigne.set(ligne, compteActuel);
      return { cle: `${ligne}__${String(compteActuel)}`, ligne };
    });
  }, [lignes]);

  return (
    <section className="kp-console-section">
      <p className="kp-console-meta">
        Flux : <strong>{etatConnexion}</strong>
      </p>
      <div className="kp-console-wrapper">
        <div className="kp-console-barre">
          <div className="kp-console-barre__boutons" aria-hidden="true">
            <span className="kp-console-barre__rond kp-console-barre__rond--fermer" />
            <span className="kp-console-barre__rond kp-console-barre__rond--reduire" />
            <span className="kp-console-barre__rond kp-console-barre__rond--agrandir" />
          </div>
          <span className="kp-console-barre__titre">{titre}</span>
          <button type="button" className="kp-btn kp-btn--ghost kp-btn--sm" onClick={surEffacer}>
            Effacer
          </button>
        </div>
        <div className="kp-console-logs" role="log">
          {dernierMessageErreur === null ? null : (
            <p className="kp-log-ligne kp-log-error" role="alert">
              {dernierMessageErreur}
            </p>
          )}
          {lignes.length === 0 ? (
            <span className="kp-log-ligne kp-log-debug">— en attente de lignes —</span>
          ) : (
            lignesAvecCle.map((entree) => (
              <div key={entree.cle} className="kp-log-ligne kp-log-info">
                {entree.ligne}
              </div>
            ))
          )}
          <div ref={refFinLogs} />
        </div>
        <div className="kp-console-saisie">
          <span className="kp-console-saisie__prompt">&gt;</span>
          <input
            className="kp-console-saisie__input"
            type="text"
            disabled
            readOnly
            placeholder="Émission de commandes réservée à une future extension API"
            aria-label="Saisie console non disponible"
          />
        </div>
      </div>
    </section>
  );
}
