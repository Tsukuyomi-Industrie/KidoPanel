import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { BadgeStatut } from "../interface/BadgeStatut.js";
import { useToastKidoPanel } from "../interface/useToastKidoPanel.js";
import { statutBadgeDepuisChaineApi } from "../interface/statutBadgeInstanceJeux.js";
import {
  arreterWebInstancePasserelle,
  demarrerWebInstancePasserelle,
  obtenirWebInstancePasserelle,
  redemarrerWebInstancePasserelle,
  supprimerWebInstancePasserelle,
  type WebInstancePasserelle,
} from "../passerelle/serviceWebInstancesPasserelle.js";
import {
  listerDomainesProxyPasserelle,
  supprimerDomaineProxyPasserelle,
  type DomaineProxyPasserelle,
} from "../passerelle/serviceProxyManagerPasserelle.js";
import { ConsoleWebInstance } from "./composants/ConsoleWebInstance.js";
import { GestionnaireFichiersInstanceWeb } from "./composants/GestionnaireFichiersInstanceWeb.js";

type Onglet = "resume" | "console" | "domaines" | "fichiers";

/** Titre lisible pour les onglets vue / journaux / domaines proxy / fichiers. */
function titreOngletDetailWeb(o: Onglet): string {
  if (o === "resume") return "Vue d’ensemble";
  if (o === "console") return "Journaux";
  if (o === "domaines") return "Domaines";
  return "Fichiers";
}

/** Détail instance web avec onglets vue, journaux SSE et domaines proxy liés. */
export function PageDetailWebInstance() {
  const { idInstance } = useParams<{ idInstance: string }>();
  const [search] = useSearchParams();
  const prefLogs = search.get("logs") === "1";
  const [instance, setInstance] = useState<WebInstancePasserelle | null>(null);
  const [domaines, setDomaines] = useState<DomaineProxyPasserelle[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<Onglet>(prefLogs ? "console" : "resume");
  const [patient, setPatient] = useState(false);
  const refSuppression = useRef<HTMLDialogElement>(null);
  const { pousserToast } = useToastKidoPanel();

  const charger = useCallback(async () => {
    const identifiantTrim = idInstance?.trim();
    if (identifiantTrim === undefined || identifiantTrim.length === 0) return;
    const [detail, tousDomaines] = await Promise.all([
      obtenirWebInstancePasserelle(identifiantTrim),
      listerDomainesProxyPasserelle(),
    ]);
    setInstance(detail);
    setDomaines(tousDomaines.filter((d) => d.webInstanceId === detail.id));
    setErreur(null);
  }, [idInstance]);

  useEffect(() => {
    const identifiantTrim = idInstance?.trim();
    if (identifiantTrim === undefined || identifiantTrim.length === 0) return;
    let annule = false;
    (async () => {
      try {
        await charger();
      } catch (error_) {
        if (annule === false) {
          setErreur(error_ instanceof Error ? error_.message : "Erreur de chargement.");
        }
      }
    })().catch(() => {});
    return () => {
      annule = true;
    };
  }, [charger, idInstance]);

  useEffect(() => {
    const identifiantTrim = idInstance?.trim();
    if (
      identifiantTrim === undefined ||
      identifiantTrim.length === 0 ||
      onglet !== "resume"
    )
      return;
    const idIntervalle = globalThis.setInterval(() => {
      charger().catch(() => {});
    }, 10_000);
    return () => globalThis.clearInterval(idIntervalle);
  }, [charger, idInstance, onglet]);

  const executer = async (libelle: string, fn: () => Promise<void>) => {
    setPatient(true);
    try {
      await fn();
      await charger();
      pousserToast(libelle, "succes");
    } catch (error_) {
      pousserToast(error_ instanceof Error ? error_.message : "Action impossible.", "erreur");
    } finally {
      setPatient(false);
    }
  };

  const statut = instance?.status ?? "";
  const transit =
    statut === "INSTALLING" || statut === "STARTING" || statut === "STOPPING";

  const identifiantTrimPourRendu = idInstance?.trim();
  if (identifiantTrimPourRendu === undefined || identifiantTrimPourRendu.length === 0) {
    return <pre className="kp-cellule-mono">Identifiant manquant.</pre>;
  }

  return (
    <>
      <p className="kp-texte-muted">
        <Link to="/hebergement/containers" className="kp-lien-inline">
          Mes containers
        </Link>
      </p>
      <div className="kp-page-entete">
        <h1 className="kp-page-titre">{instance?.name ?? "Container"}</h1>
      </div>
      {erreur === null ? null : (
        <pre role="alert" className="kp-cellule-mono">
          {erreur}
        </pre>
      )}

      {instance === null ? null : (
        <>
          <div className="kp-marges-haut-sm" role="tablist">
            {(["resume", "console", "domaines", "fichiers"] as const).map((o) => (
              <button
                key={o}
                type="button"
                role="tab"
                aria-selected={onglet === o}
                className={`kp-btn kp-btn--sm${onglet === o ? " kp-btn--primaire" : ""}`}
                onClick={() => setOnglet(o)}
              >
                {titreOngletDetailWeb(o)}
              </button>
            ))}
          </div>

          {onglet === "resume" ? (
            <section className="kp-panel-corps kp-marges-haut-sm">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                {transit === false && statut === "STOPPED" ? (
                  <button
                    type="button"
                    className="kp-btn kp-btn--primaire"
                    disabled={patient}
                    onClick={() =>
                      executer("Démarrage demandé.", () =>
                        demarrerWebInstancePasserelle(instance.id).then(() => {}),
                      ).catch(() => {})
                    }
                  >
                    Démarrer
                  </button>
                ) : null}
                {transit === false && statut === "RUNNING" ? (
                  <>
                    <button
                      type="button"
                      className="kp-btn kp-btn--danger"
                      disabled={patient}
                      onClick={() =>
                        executer("Arrêt demandé.", () =>
                          arreterWebInstancePasserelle(instance.id).then(() => {}),
                        ).catch(() => {})
                      }
                    >
                      Arrêter
                    </button>
                    <button
                      type="button"
                      className="kp-btn kp-btn--secondaire"
                      disabled={patient}
                      onClick={() =>
                        executer("Redémarrage demandé.", () =>
                          redemarrerWebInstancePasserelle(instance.id).then(() => {}),
                        ).catch(() => {})
                      }
                    >
                      Redémarrer
                    </button>
                  </>
                ) : null}
                {transit === false ? (
                  <button
                    type="button"
                    className="kp-btn kp-btn--danger"
                    disabled={patient}
                    onClick={() => refSuppression.current?.showModal()}
                  >
                    Supprimer
                  </button>
                ) : null}
              </div>
              <dl className="kidopanel-liste-definitions">
                <div>
                  <dt>Statut</dt>
                  <dd>
                    <BadgeStatut statut={statutBadgeDepuisChaineApi(instance.status)} />
                  </dd>
                </div>
                <div>
                  <dt>Stack</dt>
                  <dd>{instance.techStack}</dd>
                </div>
                <div>
                  <dt>Conteneur</dt>
                  <dd className="kp-cellule-mono">{instance.containerId ?? "—"}</dd>
                </div>
                <div>
                  <dt>Ressources</dt>
                  <dd>
                    {instance.memoryMb} Mo RAM · {instance.diskGb} Go disque
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}

          {onglet === "console" ? (
            <ConsoleWebInstance
              idInstanceWeb={instance.id}
              actif={onglet === "console"}
              execDisponible={
                instance.containerId !== null && instance.containerId.trim().length > 0
              }
            />
          ) : null}

          {onglet === "fichiers" ? (
            instance.containerId !== null && instance.containerId.trim().length > 0 ? (
              <GestionnaireFichiersInstanceWeb idInstanceWeb={instance.id} actif={true} />
            ) : (
              <p className="kp-texte-muted kp-marges-haut-sm">
                Aucun conteneur associé : explorateur de fichiers indisponible.
              </p>
            )
          ) : null}

          {onglet === "domaines" ? (
            <section className="kp-panel-corps kp-marges-haut-sm">
              <p>
                <Link to="/hebergement/proxy/nouveau" className="kp-btn kp-btn--primaire kp-btn--sm">
                  Ajouter un domaine
                </Link>
              </p>
              <ul style={{ paddingLeft: "1.2rem" }}>
                {domaines.map((d) => (
                  <li key={d.id} style={{ marginBottom: "0.5rem" }}>
                    <span className="kp-cellule-mono">{d.domaine}</span> → port{" "}
                    {String(d.portCible)}{" "}
                    <button
                      type="button"
                      className="kp-btn kp-btn--ghost kp-btn--sm"
                      disabled={patient}
                      onClick={() =>
                        executer("Domaine retiré.", async () => {
                          await supprimerDomaineProxyPasserelle(d.id);
                        }).catch(() => {})
                      }
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
              {domaines.length === 0 ? (
                <p className="kp-texte-muted">Aucun domaine pour ce container.</p>
              ) : null}
            </section>
          ) : null}
        </>
      )}

      <dialog ref={refSuppression} style={{ padding: "1rem", maxWidth: "26rem" }}>
        <p>Supprimer cette instance web et son conteneur ? Action irréversible.</p>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button type="button" className="kp-btn kp-btn--ghost" onClick={() => refSuppression.current?.close()}>
            Annuler
          </button>
          <button
            type="button"
            className="kp-btn kp-btn--danger"
            disabled={patient}
            onClick={() =>
              (async () => {
                if (instance === null) return;
                refSuppression.current?.close();
                setPatient(true);
                try {
                  await supprimerWebInstancePasserelle(instance.id);
                  pousserToast("Instance supprimée.", "succes");
                  globalThis.window.location.assign("/hebergement/containers");
                } catch (error_) {
                  pousserToast(error_ instanceof Error ? error_.message : "Échec.", "erreur");
                } finally {
                  setPatient(false);
                }
              })().catch(() => {})
            }
          >
            Supprimer
          </button>
        </div>
      </dialog>
    </>
  );
}
