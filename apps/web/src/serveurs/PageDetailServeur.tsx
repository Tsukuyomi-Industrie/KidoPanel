import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeStatut } from "../interface/BadgeStatut.js";
import { statutBadgeDepuisChaineApi } from "../interface/statutBadgeInstanceJeux.js";
import { useToastKidoPanel } from "../interface/useToastKidoPanel.js";
import { ConsoleServeur } from "./composants/ConsoleServeur.js";
import {
  obtenirInstanceServeurJeuxPasserelle,
  type InstanceServeurJeuxPasserelle,
} from "../passerelle/serviceServeursJeuxPasserelle.js";
import { supprimerInstanceServeur } from "./passerelle/actionsInstanceServeurPasserelle.js";
import { BarrePilotageDetailServeur } from "./composants/BarrePilotageDetailServeur.js";
import { DialogueSuppressionInstanceServeur } from "./composants/DialogueSuppressionInstanceServeur.js";
import { construireAdresseConnexionJeux } from "./construire-adresse-connexion-jeux-depuis-navigateur.js";
import { useHotePublicConnexionJeux } from "../interface/FournisseurHotePublicConnexionJeux.js";
import { BasculeAffichageHotePublicConnexion } from "./composants/BasculeAffichageHotePublicConnexion.js";

type OngletDetailServeur = "resume" | "console";

function libelleStatutPilotage(statut: string): string {
  switch (statut) {
    case "STARTING":
    case "STOPPING":
    case "INSTALLING":
      return "En cours…";
    default:
      return "";
  }
}

type PropsPanneauDetailServeurInstance = {
  readonly instance: InstanceServeurJeuxPasserelle;
  readonly onglet: OngletDetailServeur;
  readonly definirOnglet: (o: OngletDetailServeur) => void;
  readonly patient: boolean;
  readonly hotePublicPourJeux: string | null;
  readonly prefererHoteNavigateur: boolean;
  readonly executerAction: (
    libelleSucces: string,
    fn: () => Promise<void>,
  ) => Promise<void>;
  readonly ouvrirSuppression: () => void;
};

/** Bloc onglets résumé / console une fois l’instance chargée (réduit la complexité du composant page). */
function PanneauDetailServeurInstanceJeux({
  instance,
  onglet,
  definirOnglet,
  patient,
  hotePublicPourJeux,
  prefererHoteNavigateur,
  executerAction,
  ouvrirSuppression,
}: PropsPanneauDetailServeurInstance) {
  const statut = instance.status;
  const transition =
    statut === "STARTING" || statut === "STOPPING" || statut === "INSTALLING";

  return (
    <>
      <div className="kp-marges-haut-sm" role="tablist" aria-label="Sections détail serveur">
        <button
          type="button"
          role="tab"
          aria-selected={onglet === "resume"}
          className={`kp-btn kp-btn--sm${onglet === "resume" ? " kp-btn--primaire" : ""}`}
          onClick={() => definirOnglet("resume")}
        >
          Vue d’ensemble
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={onglet === "console"}
          className={`kp-btn kp-btn--sm${onglet === "console" ? " kp-btn--primaire" : ""}`}
          onClick={() => definirOnglet("console")}
        >
          Console
        </button>
      </div>

      {onglet === "console" ? (
        <ConsoleServeur idInstanceJeux={instance.id} actif={true} />
      ) : (
        <>
          <section className="kp-panel-corps kp-marges-haut-sm">
            <div className="kp-marges-haut-sm">
              <BarrePilotageDetailServeur
                instance={instance}
                statut={statut}
                transition={transition}
                patient={patient}
                libelleStatutPilotage={libelleStatutPilotage}
                executerAction={executerAction}
                ouvrirSuppression={ouvrirSuppression}
              />
            </div>
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
                <dt>Port connexion (hôte)</dt>
                <dd className="kp-cellule-mono">
                  {typeof instance.port === "number" ? String(instance.port) : "—"}
                </dd>
              </div>
              {instance.status === "RUNNING" && typeof instance.port === "number" ? (
                <div>
                  <dt>Adresse pour les joueurs</dt>
                  <dd className="kp-cellule-mono">
                    {construireAdresseConnexionJeux({
                      port: instance.port,
                      hotePublicConfigurePasserelle: hotePublicPourJeux,
                      forcerHotePageNavigateur: prefererHoteNavigateur,
                    })}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Ressources</dt>
                <dd>
                  {instance.memoryMb} Mo RAM · {instance.cpuCores} CPU · {instance.diskGb} Go disque
                </dd>
              </div>
            </dl>
            <BasculeAffichageHotePublicConnexion />
          </section>
        </>
      )}
    </>
  );
}

/**
 * Détail instance jeu avec onglets Résumé / Console et actions pilotage (démarrage, arrêt, suppression).
 */
export function PageDetailServeur() {
  const { hotePublicPourJeux, prefererHoteNavigateur } = useHotePublicConnexionJeux();
  const { idInstance } = useParams<{ idInstance: string }>();
  const [instance, setInstance] = useState<InstanceServeurJeuxPasserelle | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<OngletDetailServeur>("resume");
  const [patient, setPatient] = useState(false);
  const refDialogSuppression = useRef<HTMLDialogElement>(null);
  const { pousserToast } = useToastKidoPanel();

  const identifiantManquant = !idInstance?.trim();

  const charger = useCallback(async () => {
    if (!idInstance?.trim()) return;
    const detail = await obtenirInstanceServeurJeuxPasserelle(idInstance);
    setInstance(detail);
    setErreur(null);
  }, [idInstance]);

  useEffect(() => {
    if (identifiantManquant || !idInstance) {
      return;
    }
    let annule = false;
    (async () => {
      try {
        await charger();
      } catch (error_) {
        if (!annule) {
          setErreur(error_ instanceof Error ? error_.message : "Chargement impossible.");
        }
      }
    })().catch(() => {});
    return () => {
      annule = true;
    };
  }, [charger, idInstance, identifiantManquant]);

  useEffect(() => {
    if (identifiantManquant || !idInstance || onglet !== "resume") {
      return;
    }
    const idIntervalle = globalThis.setInterval(() => {
      charger().catch(() => {});
    }, 10_000);
    return () => globalThis.clearInterval(idIntervalle);
  }, [charger, idInstance, identifiantManquant, onglet]);

  const executerAction = async (
    libelleSucces: string,
    fn: () => Promise<void>,
  ) => {
    if (!idInstance) return;
    setPatient(true);
    try {
      await fn();
      await charger();
      pousserToast(libelleSucces, "succes");
    } catch (error_) {
      pousserToast(error_ instanceof Error ? error_.message : "Action impossible.", "erreur");
    } finally {
      setPatient(false);
    }
  };

  const ouvrirSuppression = () => {
    refDialogSuppression.current?.showModal();
  };

  const confirmerSuppression = async () => {
    if (!idInstance) return;
    refDialogSuppression.current?.close();
    setPatient(true);
    try {
      await supprimerInstanceServeur(idInstance);
      pousserToast("Instance supprimée.", "succes");
      globalThis.window.location.assign("/serveurs");
    } catch (error_) {
      pousserToast(error_ instanceof Error ? error_.message : "Suppression impossible.", "erreur");
    } finally {
      setPatient(false);
    }
  };

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
        <PanneauDetailServeurInstanceJeux
          instance={instance}
          onglet={onglet}
          definirOnglet={setOnglet}
          patient={patient}
          hotePublicPourJeux={hotePublicPourJeux}
          prefererHoteNavigateur={prefererHoteNavigateur}
          executerAction={executerAction}
          ouvrirSuppression={ouvrirSuppression}
        />
      ) : null}

      <DialogueSuppressionInstanceServeur
        refDialogue={refDialogSuppression}
        patient={patient}
        surAnnuler={() => refDialogSuppression.current?.close()}
        surConfirmer={confirmerSuppression}
      />
    </>
  );
}
