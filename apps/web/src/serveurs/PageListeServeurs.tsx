import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CarteServeur } from "./composants/CarteServeur.js";
import {
  listerInstancesServeursJeuxPasserelle,
  type InstanceServeurJeuxPasserelle,
} from "../passerelle/serviceServeursJeuxPasserelle.js";

/**
 * Liste des instances jeu du compte connecté (service backend via `/serveurs-jeux`).
 */
export function PageListeServeurs() {
  const [instances, setInstances] = useState<InstanceServeurJeuxPasserelle[] | null>(
    null,
  );
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    void (async () => {
      try {
        const liste = await listerInstancesServeursJeuxPasserelle();
        if (!annule) {
          setInstances(liste);
          setErreur(null);
        }
      } catch (e) {
        if (!annule) {
          setErreur(e instanceof Error ? e.message : "Chargement impossible.");
          setInstances([]);
        }
      }
    })();
    return () => {
      annule = true;
    };
  }, []);

  return (
    <div className="kidopanel-page-centree">
      <h1 className="kidopanel-titre-page">Serveurs de jeu</h1>
      <p className="kidopanel-sous-titre-page">
        Instances orchestrées par le service métier (Docker via le moteur, jamais depuis le navigateur).
      </p>
      <p className="kidopanel-texte-muted">
        Prérequis : variable <code className="kidopanel-cellule-mono">SERVER_SERVICE_BASE_URL</code> sur la
        passerelle pointant vers le service instances jeu.
      </p>
      <div style={{ marginTop: "1rem" }}>
        <Link to="/serveurs/nouveau" className="bouton-principal-kido kidopanel-lien-bouton">
          Créer un serveur
        </Link>
      </div>
      {erreur !== null ? (
        <pre className="kidopanel-cellule-mono" style={{ marginTop: "1rem" }} role="alert">
          {erreur}
        </pre>
      ) : null}
      {instances === null ? (
        <p className="kidopanel-texte-muted" style={{ marginTop: "1rem" }}>
          Chargement…
        </p>
      ) : instances.length === 0 ? (
        <p className="kidopanel-texte-muted" style={{ marginTop: "1rem" }}>
          Aucune instance pour l’instant.
        </p>
      ) : (
        <div className="kp-dash-bento" style={{ marginTop: "1rem" }}>
          {instances.map((inst) => (
            <CarteServeur key={inst.id} instance={inst} />
          ))}
        </div>
      )}
    </div>
  );
}
