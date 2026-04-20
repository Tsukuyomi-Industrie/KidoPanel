import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { creerReseauInternePasserelle } from "../passerelle/serviceReseauxInternesPasserelle.js";
import { useToastKidoPanel } from "../interface/useToastKidoPanel.js";

/** Formulaire de création d’un pont bridge utilisateur (RFC1918, isolation Internet optionnelle). */
export function PageCreationReseau() {
  const navigate = useNavigate();
  const { pousserToast } = useToastKidoPanel();
  const [nom, setNom] = useState("");
  const [cidr, setCidr] = useState("10.10.1.0/24");
  const [sansInternet, setSansInternet] = useState(false);
  const [patient, setPatient] = useState(false);
  const [erreurDerniereTentative, setErreurDerniereTentative] = useState<string | null>(null);

  const gererSoumission = async (ev: FormEvent) => {
    ev.preventDefault();
    const n = nom.trim();
    const c = cidr.trim();
    if (n.length === 0 || c.length === 0) {
      const msg = "Nom et CIDR obligatoires.";
      setErreurDerniereTentative(msg);
      pousserToast(msg, "erreur");
      return;
    }
    setPatient(true);
    setErreurDerniereTentative(null);
    try {
      await creerReseauInternePasserelle({
        nomAffichage: n,
        sousReseauCidr: c,
        sansRouteVersInternetExterne: sansInternet,
      });
      pousserToast("Réseau créé.", "succes");
      navigate("/reseaux");
    } catch (error_) {
      const msg = error_ instanceof Error ? error_.message : "Création impossible.";
      setErreurDerniereTentative(msg);
      pousserToast(msg, "erreur");
    } finally {
      setPatient(false);
    }
  };

  return (
    <>
      <p className="kp-texte-muted">
        <Link to="/reseaux" className="kp-lien-inline">
          Réseaux
        </Link>
      </p>
      <div className="kp-page-entete">
        <h1 className="kp-page-titre">Nouveau réseau</h1>
      </div>
      <form className="kp-panel-corps form-auth-kido" onSubmit={(e) => gererSoumission(e).catch(() => {})}>
        <label className="kp-section-label" htmlFor="nom">
          Nom du réseau
        </label>
        <input
          id="nom"
          className="champ-auth-kido"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="ex. Réseau privé lab"
        />
        <label className="kp-section-label" htmlFor="cidr">
          Sous-réseau (CIDR)
        </label>
        <input
          id="cidr"
          className="champ-auth-kido"
          value={cidr}
          onChange={(e) => setCidr(e.target.value)}
          placeholder="10.10.1.0/24"
        />
        <p className="kp-texte-muted" style={{ fontSize: "0.82rem" }}>
          Utilisez une plage RFC1918 non déjà utilisée sur l’hôte (ex. 10.10.x.0/24).
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem" }}>
          <input
            type="checkbox"
            checked={sansInternet}
            onChange={(e) => setSansInternet(e.target.checked)}
          />{" "}
          Isolé d’internet (aucune route vers l’extérieur)
        </label>
        <button type="submit" className="kp-btn kp-btn--primaire kp-marges-haut-sm" disabled={patient}>
          Créer le réseau
        </button>
        {erreurDerniereTentative === null ? null : (
          <pre
            className="kp-cellule-mono kp-marges-haut-sm"
            role="alert"
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              border: "1px solid var(--kp-couleur-bordure-erreur, rgba(220, 80, 80, 0.6))",
              borderRadius: "0.4rem",
              padding: "0.55rem 0.7rem",
              fontSize: "0.82rem",
            }}
          >
            <strong>Création refusée :</strong> {erreurDerniereTentative}
          </pre>
        )}
      </form>
    </>
  );
}
