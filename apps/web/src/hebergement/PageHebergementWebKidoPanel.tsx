import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listerWebInstancesPasserelle } from "../passerelle/serviceWebInstancesPasserelle.js";
import { listerDomainesProxyPasserelle } from "../passerelle/serviceProxyManagerPasserelle.js";
import { IcoHebergement } from "../interface/icones/IcoHebergement.js";

/**
 * Tableau de bord hébergement : aperçu des instances web et des domaines proxy.
 */
export function PageHebergementWebKidoPanel() {
  const [nbConteneurs, setNbConteneurs] = useState<number | null>(null);
  const [nbDomaines, setNbDomaines] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const [instances, domaines] = await Promise.all([
          listerWebInstancesPasserelle(),
          listerDomainesProxyPasserelle(),
        ]);
        if (vivant) {
          const actifs = instances.filter((i) => i.status === "RUNNING").length;
          setNbConteneurs(actifs);
          setNbDomaines(domaines.length);
          setErreur(null);
        }
      } catch (error_) {
        if (vivant) {
          setErreur(error_ instanceof Error ? error_.message : "Données indisponibles.");
          setNbConteneurs(null);
          setNbDomaines(null);
        }
      }
    })().catch(() => {});
    return () => {
      vivant = false;
    };
  }, []);

  return (
    <>
      <div className="kp-page-entete">
        <div>
          <h1 className="kp-page-titre">
            <span
              style={{
                verticalAlign: "middle",
                marginRight: "0.35rem",
                display: "inline-block",
              }}
            >
              <IcoHebergement size={26} />
            </span>{" "}
            Hébergement web
          </h1>
          <p className="kp-page-sous-titre">
            Instances applicatives et exposition HTTP via le proxy du panel.
          </p>
        </div>
      </div>
      {erreur !== null ? (
        <pre className="kp-cellule-mono kp-marges-haut-sm" role="alert">
          {erreur}
        </pre>
      ) : null}

      <div className="kp-dash-bento kp-marges-haut-sm">
        <section className="kp-dash-carte">
          <h2 className="kp-section-label">Containers applicatifs</h2>
          <p style={{ fontSize: "2rem", margin: "0.25rem 0", fontWeight: 700 }}>
            {nbConteneurs !== null ? String(nbConteneurs) : "…"}{" "}
            <span style={{ fontSize: "1rem", fontWeight: 400 }}>actifs</span>
          </p>
          <p className="kp-texte-muted" style={{ marginBottom: "1rem" }}>
            Stacks Nginx, Node.js, bases de données rapides depuis le catalogue.
          </p>
          <Link to="/hebergement/containers/nouveau" className="kp-btn kp-btn--primaire">
            Créer un container
          </Link>{" "}
          <Link to="/hebergement/containers" className="kp-btn kp-btn--ghost kp-marges-haut-sm">
            Voir tous
          </Link>
        </section>
        <section className="kp-dash-carte">
          <h2 className="kp-section-label">Proxy Manager</h2>
          <p style={{ fontSize: "2rem", margin: "0.25rem 0", fontWeight: 700 }}>
            {nbDomaines !== null ? String(nbDomaines) : "…"}{" "}
            <span style={{ fontSize: "1rem", fontWeight: 400 }}>domaines</span>
          </p>
          <p className="kp-texte-muted" style={{ marginBottom: "1rem" }}>
            Pointage vers vos containers sur le réseau interne Docker du panel.
          </p>
          <Link to="/hebergement/proxy/nouveau" className="kp-btn kp-btn--primaire">
            Ajouter un domaine
          </Link>{" "}
          <Link to="/hebergement/proxy" className="kp-btn kp-btn--ghost kp-marges-haut-sm">
            Gérer les domaines
          </Link>
        </section>
      </div>
    </>
  );
}
