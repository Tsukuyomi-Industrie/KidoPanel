import { enregistrerJetonStockage } from "./passerelleClient.js";
import { styleBlocLab } from "./stylesCommunsLab.js";

type PropsSectionAuthLab = {
  readonly emailInscription: string;
  readonly setEmailInscription: (v: string) => void;
  readonly motDePasseInscription: string;
  readonly setMotDePasseInscription: (v: string) => void;
  readonly emailConnexion: string;
  readonly setEmailConnexion: (v: string) => void;
  readonly motDePasseConnexion: string;
  readonly setMotDePasseConnexion: (v: string) => void;
  readonly jeton: string;
  readonly setJeton: (v: string) => void;
  readonly surInscription: () => void;
  readonly surConnexion: () => void;
};

/** Formulaires d’inscription, de connexion et champ jeton JWT pour la passerelle. */
export function SectionAuthLab({
  emailInscription,
  setEmailInscription,
  motDePasseInscription,
  setMotDePasseInscription,
  emailConnexion,
  setEmailConnexion,
  motDePasseConnexion,
  setMotDePasseConnexion,
  jeton,
  setJeton,
  surInscription,
  surConnexion,
}: PropsSectionAuthLab) {
  return (
    <section style={styleBlocLab}>
      <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Authentification</h2>
      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "1fr 1fr",
          maxWidth: 640,
        }}
      >
        <div>
          <h3 style={{ fontSize: "0.95rem" }}>Inscription</h3>
          <label style={{ display: "block", marginBottom: 6 }}>
            E-mail{" "}
            <input
              type="email"
              value={emailInscription}
              onChange={(e) => setEmailInscription(e.target.value)}
              autoComplete="email"
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 6 }}>
            Mot de passe{" "}
            <input
              type="password"
              value={motDePasseInscription}
              onChange={(e) => setMotDePasseInscription(e.target.value)}
              autoComplete="new-password"
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>
          <button type="button" onClick={() => surInscription()}>
            S’inscrire
          </button>
        </div>
        <div>
          <h3 style={{ fontSize: "0.95rem" }}>Connexion</h3>
          <label style={{ display: "block", marginBottom: 6 }}>
            E-mail{" "}
            <input
              type="email"
              value={emailConnexion}
              onChange={(e) => setEmailConnexion(e.target.value)}
              autoComplete="email"
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 6 }}>
            Mot de passe{" "}
            <input
              type="password"
              value={motDePasseConnexion}
              onChange={(e) => setMotDePasseConnexion(e.target.value)}
              autoComplete="current-password"
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>
          <button type="button" onClick={() => surConnexion()}>
            Se connecter
          </button>
        </div>
      </div>
      <div style={{ marginTop: "0.75rem" }}>
        <label style={{ display: "block", maxWidth: 480 }}>
          Jeton JWT (stocké en local, utilisé pour les requêtes){" "}
          <input
            type="password"
            value={jeton}
            onChange={(e) => setJeton(e.target.value)}
            onBlur={() => {
              enregistrerJetonStockage(jeton);
            }}
            autoComplete="off"
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
        <button
          type="button"
          style={{ marginTop: 8 }}
          onClick={() => {
            setJeton("");
            enregistrerJetonStockage("");
          }}
        >
          Déconnexion (effacer le jeton)
        </button>
      </div>
    </section>
  );
}
