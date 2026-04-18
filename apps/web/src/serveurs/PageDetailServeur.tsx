import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

  useEffect(() => {
    if (!idInstance?.trim()) {
      setErreur("Identifiant d’instance manquant dans l’URL.");
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
  }, [idInstance]);

  return (
    <div className="kidopanel-page-centree">
      <p className="kidopanel-texte-muted">
        <Link to="/serveurs" className="kidopanel-lien-bouton-secondaire">
          Retour à la liste
        </Link>
      </p>
      <h1 className="kidopanel-titre-page">
        {instance?.name ?? "Instance jeu"}
      </h1>
      {erreur !== null ? (
        <pre className="kidopanel-cellule-mono" role="alert">
          {erreur}
        </pre>
      ) : null}
      {instance !== null ? (
        <>
          <section className="kidopanel-carte-principale" style={{ marginTop: "1rem" }}>
            <h2 className="kidopanel-titre-section">Résumé</h2>
            <dl className="kidopanel-liste-definitions">
              <div>
                <dt>Statut</dt>
                <dd>{instance.status}</dd>
              </div>
              <div>
                <dt>Jeu</dt>
                <dd>{instance.gameType}</dd>
              </div>
              <div>
                <dt>Conteneur Docker</dt>
                <dd className="kidopanel-cellule-mono">
                  {instance.containerId ?? "—"}
                </dd>
              </div>
              <div>
                <dt>Ressources</dt>
                <dd>
                  {instance.memoryMb} Mo RAM · {instance.cpuCores} CPU · {instance.diskGb} Go disque
                </dd>
              </div>
            </dl>
          </section>
          <div style={{ marginTop: "1rem" }}>
            <ConsoleServeur idInstanceJeux={instance.id} actif={Boolean(instance.containerId)} />
          </div>
        </>
      ) : null}
    </div>
  );
}
