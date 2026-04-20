import { useEffect, useMemo, useRef } from "react";
import { urlBasePasserelle } from "../../passerelle/url-base-passerelle.js";
import { lireJetonStockage } from "../../lab/passerelleClient.js";
import { useConsoleWebInstance } from "../hooks/useConsoleWebInstance.js";

type PropsConsoleWebInstance = {
  readonly idInstanceWeb: string;
  readonly actif: boolean;
};

/**
 * Console temps réel des journaux pour une instance web (SSE via `/web-instances`).
 */
export function ConsoleWebInstance({ idInstanceWeb, actif }: PropsConsoleWebInstance) {
  const jeton = lireJetonStockage();
  const refFinLogs = useRef<HTMLDivElement>(null);
  const { lignes, etatConnexion, dernierMessageErreur, effacer } = useConsoleWebInstance({
    urlBasePasserelle: urlBasePasserelle(),
    idInstanceWeb,
    jetonBearer: jeton,
    actif,
    tailEntrees: 500,
    lignesMaxAffichage: 500,
  });

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
          <span className="kp-console-barre__titre">console — instance web</span>
          <button type="button" className="kp-btn kp-btn--ghost kp-btn--sm" onClick={effacer}>
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
