import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeStatut } from "../interface/BadgeStatut.js";
import { statutBadgeDepuisChaineApi } from "../interface/statutBadgeInstanceJeux.js";
import { ConsoleServeur } from "./composants/ConsoleServeur.js";
import {
  obtenirInstanceServeurJeuxPasserelle,
  type InstanceServeurJeuxPasserelle,
} from "../passerelle/serviceServeursJeuxPasserelle.js";

/**
 * Détail d’une instance jeu : métadonnées persistées et console temps réel (SSE).
 */
export function PageDetailServeur() {
  const { idInstance } = useParams<{ idInstance: string }>();
  const [instance, setInstance] = useState<InstanceServeurJeuxPasserelle | null>(
    null,
  );
  const [erreur, setErreur] = useState<string | null>(null);

  const identifiantManquant = !idInstance?.trim();

  useEffect(() => {
    if (identifiantManquant || !idInstance) {
      return;
    }
    let annule = false;
    void (async () => {
      try {
        const detail = await obtenirInstanceServeurJeuxPasserelle(idInstance);
        if (!annule) {
          setInstance(detail);
          setErreur(null);
        }
      } catch (e) {
        if (!annule) {
          setErreur(e instanceof Error ? e.message : "Chargement impossible.");
        }
      }
    })();
    return () => {
      annule = true;
    };
  }, [idInstance, identifiantManquant]);

  if (identifiantManquant) {
    return (
      <pre className="kp-cellule-mono" role="alert">
        Identifiant d’instance manquant dans l’URL.
      </pre>
    );
  }

  return (
    <>
      <p className="kp-texte-muted">
        <Link to="/serveurs" className="kp-lien-inline">
          Retour à la liste
        </Link>
      </p>
      <div className="kp-page-entete">
        <h1 className="kp-page-titre">{instance?.name ?? "Instance jeu"}</h1>
      </div>
      {erreur !== null ? (
        <pre className="kp-cellule-mono" role="alert">
          {erreur}
        </pre>
      ) : null}
      {instance !== null ? (
        <>
          <section className="kp-panel-corps">
            <h2 className="kp-section-label">Résumé</h2>
            <dl className="kidopanel-liste-definitions">
              <div>
                <dt>Statut</dt>
                <dd>
                  <BadgeStatut statut={statutBadgeDepuisChaineApi(instance.status)} />
                </dd>
              </div>
              <div>
                <dt>Jeu</dt>
                <dd>{instance.gameType}</dd>
              </div>
              <div>
                <dt>Conteneur Docker</dt>
                <dd className="kp-cellule-mono">{instance.containerId ?? "—"}</dd>
              </div>
              <div>
                <dt>Ressources</dt>
                <dd>
                  {instance.memoryMb} Mo RAM · {instance.cpuCores} CPU · {instance.diskGb} Go disque
                </dd>
              </div>
            </dl>
          </section>
          <ConsoleServeur idInstanceJeux={instance.id} actif={Boolean(instance.containerId)} />
        </>
      ) : null}
    </>
  );
}
