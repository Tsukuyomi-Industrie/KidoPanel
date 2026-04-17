import { Link } from "react-router-dom";
import type { IndicateursTableauPasserelle } from "../passerelle/serviceIndicateursPasserelle.js";
import { urlBasePasserelle } from "../passerelle/url-base-passerelle.js";

type PropsTableauBordPresentationKidoPanel = {
  emailUtilisateur: string;
  donnees: IndicateursTableauPasserelle | null;
  chargement: boolean;
  erreur: string | null;
  surRecharger: () => void;
};

/**
 * Présentation du tableau de bord : grille bento, signature visuelle KidoPanel et lecture rapide des indicateurs.
 */
export function TableauBordPresentationKidoPanel({
  emailUtilisateur,
  donnees,
  chargement,
  erreur,
  surRecharger,
}: PropsTableauBordPresentationKidoPanel) {
  const prenom = emailUtilisateur.includes("@")
    ? emailUtilisateur.split("@")[0]
    : emailUtilisateur;

  return (
    <div className="kp-dash">
      <div className="kp-dash__filigrane" aria-hidden="true" />

      <header className="kp-dash-hero">
        <div className="kp-dash-hero__marque">
          <span className="kp-dash-hero__sigle">K</span>
          <div>
            <p className="kp-dash-hero__accroche">Panneau d’observation</p>
            <h1 className="kp-dash-hero__titre">Bonjour, {prenom}</h1>
          </div>
        </div>
        <p className="kp-dash-hero__texte">
          Vue synthétique de votre périmètre : conteneurs isolés par compte, santé des couches données et
          moteur, ancrage sur la passerelle KidoPanel.
        </p>
        <div className="kp-dash-hero__actions">
          <Link to="/coeur-docker" className="bouton-principal-kido kidopanel-lien-bouton">
            Cœur Docker
          </Link>
          <button type="button" className="bouton-secondaire-kido" onClick={() => void surRecharger()}>
            Actualiser les mesures
          </button>
        </div>
      </header>

      {erreur !== null ? <div className="bandeau-erreur-auth kp-dash-erreur">{erreur}</div> : null}

      <div className="kp-dash-bento" aria-busy={chargement}>
        <article className="kp-dash-carte kp-dash-carte--vedette">
          <div className="kp-dash-carte__haut">
            <h2 className="kp-dash-carte__titre">Vos conteneurs</h2>
            <span className="kp-dash-carte__pastille">Périmètre compte</span>
          </div>
          {chargement ? (
            <p className="kp-dash-carte__muted">Chargement des indicateurs…</p>
          ) : donnees !== null ? (
            <>
              <p className="kp-dash-carte__chiffre">{String(donnees.conteneurs.total)}</p>
              <p className="kp-dash-carte__detail">
                <span className="kp-dash-carte__etq">En ligne</span>{" "}
                <strong>{String(donnees.conteneurs.enLigne)}</strong>
                <span className="kp-dash-carte__sep" aria-hidden="true" />
                <span className="kp-dash-carte__etq">Hors ligne</span>{" "}
                <strong>{String(donnees.conteneurs.horsLigne)}</strong>
              </p>
            </>
          ) : (
            <p className="kp-dash-carte__muted">Mesures indisponibles.</p>
          )}
        </article>

        <article className="kp-dash-carte">
          <h2 className="kp-dash-carte__titre">PostgreSQL</h2>
          <p className="kp-dash-carte__sous">Persistance du panel</p>
          {chargement ? (
            <p className="kp-dash-carte__muted">…</p>
          ) : donnees !== null ? (
            <>
              <p
                className={
                  donnees.postgresql.joignable ? "kp-dash-etat kp-dash-etat--ok" : "kp-dash-etat kp-dash-etat--ko"
                }
              >
                {donnees.postgresql.joignable ? "Joignable" : "Injoignable"}
              </p>
              {donnees.postgresql.latenceMs !== undefined ? (
                <p className="kp-dash-carte__detail">Sonde : {String(donnees.postgresql.latenceMs)} ms</p>
              ) : null}
              {donnees.postgresql.message !== undefined ? (
                <p className="kp-dash-carte__muted">{donnees.postgresql.message}</p>
              ) : null}
            </>
          ) : null}
        </article>

        <article className="kp-dash-carte">
          <h2 className="kp-dash-carte__titre">Moteur Docker</h2>
          <p className="kp-dash-carte__sous">Container engine</p>
          {chargement ? (
            <p className="kp-dash-carte__muted">…</p>
          ) : donnees !== null ? (
            <>
              <p
                className={
                  donnees.moteurDocker.joignable ? "kp-dash-etat kp-dash-etat--ok" : "kp-dash-etat kp-dash-etat--ko"
                }
              >
                {donnees.moteurDocker.joignable ? "Joignable" : "Injoignable"}
              </p>
              {donnees.moteurDocker.message !== undefined ? (
                <p className="kp-dash-carte__muted">{donnees.moteurDocker.message}</p>
              ) : null}
            </>
          ) : null}
        </article>

        <article className="kp-dash-ruban">
          <h2 className="kp-dash-ruban__titre">Passerelle API</h2>
          <code className="kp-dash-ruban__url">{urlBasePasserelle()}</code>
          <p className="kp-dash-ruban__note">
            Les totaux ci-dessus ne comptent que les conteneurs dont vous êtes propriétaire côté passerelle.
          </p>
        </article>
      </div>

      <p className="kp-dash-signature">KidoPanel — orchestration claire pour vos charges conteneurisées.</p>
    </div>
  );
}
