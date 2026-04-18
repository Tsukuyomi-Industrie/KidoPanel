import { useCallback, useEffect, useState } from "react";
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

  const charger = useCallback(async () => {
    try {
      const liste = await listerInstancesServeursJeuxPasserelle();
      setInstances(liste);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setInstances([]);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void charger();
    }, 0);
    return () => window.clearTimeout(id);
  }, [charger]);

  return (
    <>
      <div className="kp-page-entete">
        <div>
          <h1 className="kp-page-titre">Serveurs de jeu</h1>
          <p className="kp-page-sous-titre">
            Instances orchestrées par le service métier (Docker via le moteur, jamais depuis le navigateur).
          </p>
        </div>
        <Link to="/serveurs/nouveau" className="kp-btn kp-btn--primaire">
          Créer un serveur
        </Link>
      </div>
      <p className="kp-texte-muted">
        Prérequis : variable <code className="kp-cellule-mono">SERVER_SERVICE_BASE_URL</code> sur la passerelle
        pointant vers le service instances jeu.
      </p>
      {erreur !== null ? (
        <pre className="kp-cellule-mono kp-marges-haut-sm" role="alert">
          {erreur}
        </pre>
      ) : null}
      {instances === null ? (
        <p className="kp-texte-muted kp-marges-haut-sm">Chargement…</p>
      ) : instances.length === 0 ? (
        <p className="kp-texte-muted kp-marges-haut-sm">Aucune instance pour l’instant.</p>
      ) : (
        <div className="kp-grille-cartes-serveurs kp-marges-haut-sm">
          {instances.map((inst) => (
            <CarteServeur key={inst.id} instance={inst} surMiseAJourListe={charger} />
          ))}
        </div>
      )}
    </>
  );
}
