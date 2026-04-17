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
    <div className="grille-centre-auth fond-app-kido">
      <div className="carte-auth-kido">
        <header className="marque-kido">
          <h1 className="marque-kido__titre">KidoPanel</h1>
          <p className="marque-kido__sous">
            Accédez à votre espace sécurisé : la passerelle valide les identifiants, applique un coût bcrypt
            côté serveur et émet un jeton signé pour vos requêtes suivantes.
          </p>
        </header>

        <div className="onglets-auth" role="tablist" aria-label="Mode d’authentification">
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
            className="form-auth-kido"
            onSubmit={(e) => {
              e.preventDefault();
              void soumettreConnexion();
            }}
          >
            <div className="champ-auth-kido">
              <label htmlFor="kp-email-connexion">Adresse e-mail</label>
              <input
                id="kp-email-connexion"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="champ-auth-kido">
              <label htmlFor="kp-mdp-connexion">Mot de passe</label>
              <input
                id="kp-mdp-connexion"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
            </div>
            <label className="ligne-souvenir">
              <input
                type="checkbox"
                checked={seSouvenir}
                onChange={(e) => setSeSouvenir(e.target.checked)}
              />
              Se souvenir de cet appareil (jeton conservé en local sur ce navigateur ; à désactiver sur un poste partagé)
            </label>
            <button className="bouton-principal-kido" type="submit" disabled={chargement}>
              {chargement ? "Connexion en cours…" : "Se connecter"}
            </button>
          </form>
        ) : (
          <form
            className="form-auth-kido"
            onSubmit={(e) => {
              e.preventDefault();
              void soumettreInscription();
            }}
          >
            <div className="champ-auth-kido">
              <label htmlFor="kp-email-inscription">Adresse e-mail</label>
              <input
                id="kp-email-inscription"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="champ-auth-kido">
              <label htmlFor="kp-mdp-inscription">Mot de passe</label>
              <input
                id="kp-mdp-inscription"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
            </div>
            <div className="champ-auth-kido">
              <label htmlFor="kp-mdp-confirmation">Confirmation du mot de passe</label>
              <input
                id="kp-mdp-confirmation"
                name="password-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </div>
            <label className="ligne-souvenir">
              <input
                type="checkbox"
                checked={seSouvenir}
                onChange={(e) => setSeSouvenir(e.target.checked)}
              />
              Conserver la session sur cet appareil après fermeture du navigateur
            </label>
            <button className="bouton-principal-kido" type="submit" disabled={chargement}>
              {chargement ? "Création du compte…" : "Créer le compte"}
            </button>
          </form>
        )}

        <section className="encadre-securite" aria-label="Rappels de sécurité">
          <strong>Rappels utiles</strong>
          <ul>
            <li>Utilisez HTTPS en production pour protéger le transit du mot de passe et du jeton.</li>
            <li>Ne réutilisez pas un mot de passe déjà employé sur d’autres services.</li>
            <li>Fermez la session sur les postes partagés : sans case cochée, le jeton disparaît avec l’onglet.</li>
          </ul>
        </section>

        <p style={{ margin: "0.85rem 0 0", fontSize: "0.8rem", color: "var(--text)" }}>
          Passerelle cible : <code>{basePasserelle}</code>
        </p>
      </div>
    </div>
  );
}
