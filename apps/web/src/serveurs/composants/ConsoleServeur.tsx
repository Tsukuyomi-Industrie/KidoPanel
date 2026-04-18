import { useConsoleServeur } from "../hooks/useConsoleServeur.js";
import { urlBasePasserelle } from "../../passerelle/url-base-passerelle.js";
import { lireJetonStockage } from "../../lab/passerelleClient.js";

type PropsConsoleServeur = {
  idInstanceJeux: string;
  actif: boolean;
};

/**
 * Panneau texte du flux journaux conteneur pour une instance jeu (SSE via passerelle).
 */
export function ConsoleServeur({ idInstanceJeux, actif }: PropsConsoleServeur) {
  const jeton = lireJetonStockage();
  const { lignes, etatConnexion, dernierMessageErreur, effacer } =
    useConsoleServeur({
      urlBasePasserelle: urlBasePasserelle(),
      idInstanceJeux,
      jetonBearer: jeton,
      actif,
      tailEntrees: 500,
      lignesMaxAffichage: 500,
    });

  return (
    <section className="kidopanel-carte-principale">
      <h2 className="kidopanel-titre-section">Console (temps réel)</h2>
      <p className="kidopanel-texte-muted">
        État du flux : <strong>{etatConnexion}</strong>
      </p>
      <button type="button" className="kidopanel-bouton-secondaire kidopanel-marges-haut" onClick={effacer}>
        Effacer l’affichage
      </button>
      {dernierMessageErreur !== null ? (
        <pre className="kidopanel-cellule-mono kidopanel-marges-haut" role="alert">
          {dernierMessageErreur}
        </pre>
      ) : null}
      <pre
        className="kidopanel-cellule-mono kidopanel-marges-haut"
        style={{ maxHeight: "26rem", overflow: "auto", whiteSpace: "pre-wrap" }}
      >
        {lignes.length === 0
          ? "— en attente de lignes —"
          : lignes.join("\n")}
      </pre>
    </section>
  );
}
