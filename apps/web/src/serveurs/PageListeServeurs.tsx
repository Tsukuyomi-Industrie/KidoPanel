import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CarteServeur } from "./composants/CarteServeur.js";
import { BasculeAffichageHotePublicConnexion } from "./composants/BasculeAffichageHotePublicConnexion.js";
import { BandeauDiagnosticPareFeuHote } from "../interface/BandeauDiagnosticPareFeuHote.js";
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
    } catch (error_) {
      setErreur(error_ instanceof Error ? error_.message : "Chargement impossible.");
      setInstances([]);
    }
  }, []);

  const remplacerInstanceDansListe = useCallback(
    (instance: InstanceServeurJeuxPasserelle) => {
      setInstances((prev) => {
        if (prev === null) {
          return prev;
        }
        return prev.map((l) => (l.id === instance.id ? instance : l));
      });
    },
    [],
  );

  useEffect(() => {
    const id = globalThis.setTimeout(() => {
      charger();
    }, 0);
    return () => globalThis.clearTimeout(id);
  }, [charger]);

  let corpsListeServeursJeux: ReactNode;
  if (instances === null) {
    corpsListeServeursJeux = <p className="kp-texte-muted kp-marges-haut-sm">Chargement…</p>;
  } else if (instances.length === 0) {
    corpsListeServeursJeux = (
      <p className="kp-texte-muted kp-marges-haut-sm">Aucune instance pour l’instant.</p>
    );
  } else {
    corpsListeServeursJeux = (
      <div className="kp-grille-cartes-serveurs kp-marges-haut-sm">
        {instances.map((inst) => (
          <CarteServeur
            key={inst.id}
            instance={inst}
            surMiseAJourListe={charger}
            surMiseAJourPartielle={remplacerInstanceDansListe}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="kp-encart-contexte-flux kp-marges-haut-sm" role="note">
        <strong>Vos serveurs de jeu</strong>
        <p style={{ margin: "0.35rem 0 0" }}>
          Créez un serveur en quelques clics. Le panel configure automatiquement les ports et les options de lancement ;
          vous ne manipulez pas la configuration Docker à la main.
        </p>
      </div>

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
        Le service instances jeu doit tourner sur la machine (par défaut port 8790) ; sinon définissez{" "}
        <code className="kp-cellule-mono">SERVER_SERVICE_BASE_URL</code> sur la passerelle.
      </p>
      <BasculeAffichageHotePublicConnexion />
      <BandeauDiagnosticPareFeuHote lieuAffichage="Serveurs de jeu" />
      {erreur !== null ? (
        <pre className="kp-cellule-mono kp-marges-haut-sm" role="alert">
          {erreur}
        </pre>
      ) : null}
      {corpsListeServeursJeux}
    </>
  );
}
