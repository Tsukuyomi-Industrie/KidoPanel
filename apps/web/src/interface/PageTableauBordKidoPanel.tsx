import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  chargerIndicateursTableauPasserelle,
  type IndicateursTableauPasserelle,
} from "../passerelle/serviceIndicateursPasserelle.js";
import { urlBasePasserelle } from "../passerelle/url-base-passerelle.js";

type PropsPageTableauBordKidoPanel = {
  emailUtilisateur: string;
};

/**
 * Vue d’ensemble : synthèse infrastructure, base PostgreSQL, moteur Docker et volumétrie conteneurs.
 */
export function PageTableauBordKidoPanel({ emailUtilisateur }: PropsPageTableauBordKidoPanel) {
  const [donnees, setDonnees] = useState<IndicateursTableauPasserelle | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setDonnees(await chargerIndicateursTableauPasserelle());
    } catch (e) {
      setDonnees(null);
      setErreur(e instanceof Error ? e.message : "Chargement des indicateurs impossible.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  return (
    <div className="kidopanel-page-centree">
      <header className="kidopanel-hero-tableau">
        <p className="kidopanel-sur-titre">Tableau de bord</p>
        <h1 className="kidopanel-titre-page">Bonjour, {emailUtilisateur}</h1>
        <p className="kidopanel-sous-titre-page">
          Vision consolidée de l’hôte : état des services KidoPanel et de vos conteneurs isolés par compte.
        </p>
        <div className="kidopanel-hero-actions">
          <Link to="/coeur-docker" className="bouton-principal-kido kidopanel-lien-bouton">
            Ouvrir le cœur Docker
          </Link>
          <button type="button" className="bouton-secondaire-kido" onClick={() => void charger()}>
            Recharger les indicateurs
          </button>
        </div>
      </header>

      {erreur !== null ? <div className="bandeau-erreur-auth">{erreur}</div> : null}

      <div className="kidopanel-grille-metriques">
        <article className="kidopanel-tuile-metrique">
          <h3>Conteneurs (votre périmètre)</h3>
          {chargement ? (
            <p className="kidopanel-texte-muted">Chargement…</p>
          ) : donnees !== null ? (
            <>
              <p className="kidopanel-chiffre-metrique">{String(donnees.conteneurs.total)}</p>
              <p className="kidopanel-detail-metrique">
                En ligne : <strong>{String(donnees.conteneurs.enLigne)}</strong> — hors ligne :{" "}
                <strong>{String(donnees.conteneurs.horsLigne)}</strong>
              </p>
            </>
          ) : (
            <p className="kidopanel-texte-muted">Données indisponibles.</p>
          )}
        </article>
        <article className="kidopanel-tuile-metrique">
          <h3>PostgreSQL (panel)</h3>
          {chargement ? (
            <p className="kidopanel-texte-muted">Chargement…</p>
          ) : donnees !== null ? (
            <>
              <p
                className={
                  donnees.postgresql.joignable
                    ? "kidopanel-etat-ok"
                    : "kidopanel-etat-ko"
                }
              >
                {donnees.postgresql.joignable ? "Joignable" : "Injoignable"}
              </p>
              {donnees.postgresql.latenceMs !== undefined ? (
                <p className="kidopanel-detail-metrique">
                  Latence sonde : {String(donnees.postgresql.latenceMs)} ms
                </p>
              ) : null}
              {donnees.postgresql.message !== undefined ? (
                <p className="kidopanel-texte-muted">{donnees.postgresql.message}</p>
              ) : null}
            </>
          ) : null}
        </article>
        <article className="kidopanel-tuile-metrique">
          <h3>Moteur Docker</h3>
          {chargement ? (
            <p className="kidopanel-texte-muted">Chargement…</p>
          ) : donnees !== null ? (
            <>
              <p className={donnees.moteurDocker.joignable ? "kidopanel-etat-ok" : "kidopanel-etat-ko"}>
                {donnees.moteurDocker.joignable ? "Joignable" : "Injoignable"}
              </p>
              {donnees.moteurDocker.message !== undefined ? (
                <p className="kidopanel-texte-muted">{donnees.moteurDocker.message}</p>
              ) : null}
            </>
          ) : null}
        </article>
        <article className="kidopanel-tuile-metrique kidopanel-tuile-metrique--large">
          <h3>Passerelle API</h3>
          <p className="kidopanel-cellule-mono kidopanel-url-passe">{urlBasePasserelle()}</p>
          <p className="kidopanel-texte-muted">
            Les volumes ci-dessus reflètent uniquement les conteneurs dont vous êtes propriétaire côté
            passerelle ; le démon Docker global peut en contenir davantage sur l’hôte.
          </p>
        </article>
      </div>
    </div>
  );
}
