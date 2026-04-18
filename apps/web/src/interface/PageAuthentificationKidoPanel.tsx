import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { enregistrerJetonApresAuthentificationPanel } from "../lab/passerelleClient.js";
import {
  connecterViaPasserelle,
  inscrireViaPasserelle,
} from "../passerelle/serviceAuthPasserelle.js";
import { urlBasePasserelle } from "../passerelle/url-base-passerelle.js";
import { messagePolitiqueMotDePasseInscription } from "./politiqueMotDePassePanel.js";

type ModeOngletAuth = "connexion" | "inscription";

/**
 * Écran unique de connexion et d’inscription : validation locale renforcée, option de persistance, textes entièrement en français.
 */
export function PageAuthentificationKidoPanel() {
  const navigate = useNavigate();
  const [onglet, setOnglet] = useState<ModeOngletAuth>("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [seSouvenir, setSeSouvenir] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const basePasserelle = useMemo(() => urlBasePasserelle(), []);

  const soumettreConnexion = async () => {
    setErreur(null);
    setChargement(true);
    try {
      const { jeton } = await connecterViaPasserelle(email.trim(), motDePasse);
      enregistrerJetonApresAuthentificationPanel(jeton, seSouvenir);
      void navigate("/", { replace: true });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      setChargement(false);
    }
  };

  const soumettreInscription = async () => {
    setErreur(null);
    const politique = messagePolitiqueMotDePasseInscription(motDePasse);
    if (politique !== null) {
      setErreur(politique);
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur("Les deux saisies du mot de passe ne correspondent pas.");
      return;
    }
    setChargement(true);
    try {
      const { jeton } = await inscrireViaPasserelle(email.trim(), motDePasse);
      enregistrerJetonApresAuthentificationPanel(jeton, seSouvenir);
      void navigate("/", { replace: true });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Inscription impossible.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="kp-login-page">
      <div className="kp-login-carte">
        <header className="kp-login-logo">
          <span className="kp-login-logo__sigle">K</span>
          <span className="kp-login-logo__nom">KidoPanel</span>
          <p className="kp-login-logo__sous">
            La passerelle valide les identifiants, applique bcrypt côté serveur et émet un jeton signé pour vos
            requêtes suivantes.
          </p>
        </header>

        <div className="kp-onglets-auth" role="tablist" aria-label="Mode d’authentification">
          <button
            type="button"
            role="tab"
            aria-selected={onglet === "connexion"}
            onClick={() => {
              setOnglet("connexion");
              setErreur(null);
            }}
          >
            Connexion
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={onglet === "inscription"}
            onClick={() => {
              setOnglet("inscription");
              setErreur(null);
            }}
          >
            Créer un compte
          </button>
        </div>

        {erreur !== null ? <div className="bandeau-erreur-auth">{erreur}</div> : null}

        {onglet === "connexion" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void soumettreConnexion();
            }}
          >
            <div className="kp-champ">
              <label className="kp-champ__label" htmlFor="kp-email-connexion">
                Adresse e-mail
              </label>
              <input
                id="kp-email-connexion"
                name="email"
                className="kp-input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="kp-champ">
              <label className="kp-champ__label" htmlFor="kp-mdp-connexion">
                Mot de passe
              </label>
              <input
                id="kp-mdp-connexion"
                name="password"
                className="kp-input"
                type="password"
                autoComplete="current-password"
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
            </div>
            <label className="kp-ligne-souvenir">
              <input
                type="checkbox"
                checked={seSouvenir}
                onChange={(e) => setSeSouvenir(e.target.checked)}
              />
              Se souvenir de cet appareil (jeton conservé en local ; à désactiver sur un poste partagé)
            </label>
            <button className="kp-btn kp-btn--primaire" style={{ width: "100%", marginTop: "0.5rem" }} type="submit" disabled={chargement}>
              {chargement ? "Connexion en cours…" : "Se connecter"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void soumettreInscription();
            }}
          >
            <div className="kp-champ">
              <label className="kp-champ__label" htmlFor="kp-email-inscription">
                Adresse e-mail
              </label>
              <input
                id="kp-email-inscription"
                name="email"
                className="kp-input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="kp-champ">
              <label className="kp-champ__label" htmlFor="kp-mdp-inscription">
                Mot de passe
              </label>
              <input
                id="kp-mdp-inscription"
                name="password"
                className="kp-input"
                type="password"
                autoComplete="new-password"
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
            </div>
            <div className="kp-champ">
              <label className="kp-champ__label" htmlFor="kp-mdp-confirmation">
                Confirmation du mot de passe
              </label>
              <input
                id="kp-mdp-confirmation"
                name="password-confirm"
                className="kp-input"
                type="password"
                autoComplete="new-password"
                required
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </div>
            <label className="kp-ligne-souvenir">
              <input
                type="checkbox"
                checked={seSouvenir}
                onChange={(e) => setSeSouvenir(e.target.checked)}
              />
              Conserver la session sur cet appareil après fermeture du navigateur
            </label>
            <button className="kp-btn kp-btn--primaire" style={{ width: "100%", marginTop: "0.5rem" }} type="submit" disabled={chargement}>
              {chargement ? "Création du compte…" : "Créer le compte"}
            </button>
          </form>
        )}

        <section className="kp-encadre-securite" aria-label="Rappels de sécurité">
          <strong>Rappels utiles</strong>
          <ul>
            <li>Utilisez HTTPS en production pour protéger le transit du mot de passe et du jeton.</li>
            <li>Ne réutilisez pas un mot de passe déjà employé sur d’autres services.</li>
            <li>Fermez la session sur les postes partagés : sans case cochée, le jeton disparaît avec l’onglet.</li>
          </ul>
        </section>

        <p className="kp-lien-passerelle">
          Passerelle cible : <code className="kp-cellule-mono">{basePasserelle}</code>
        </p>
      </div>
    </div>
  );
}
