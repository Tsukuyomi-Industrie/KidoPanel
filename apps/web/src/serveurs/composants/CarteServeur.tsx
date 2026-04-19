import { useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  arreterInstanceServeurJeuxPasserelle,
  demarrerInstanceServeurJeuxPasserelle,
  type InstanceServeurJeuxPasserelle,
} from "../../passerelle/serviceServeursJeuxPasserelle.js";
import { supprimerInstanceServeur } from "../passerelle/actionsInstanceServeurPasserelle.js";
import { DialogueSuppressionInstanceServeur } from "./DialogueSuppressionInstanceServeur.js";
import { BadgeStatut } from "../../interface/BadgeStatut.js";
import { useToastKidoPanel } from "../../interface/useToastKidoPanel.js";
import { BarreRessource } from "../../interface/BarreRessource.js";
import { IcoArret } from "../../interface/icones/IcoArret.js";
import { IcoConsoleJeux } from "../../interface/icones/IcoConsoleJeux.js";
import { IcoDemarrer } from "../../interface/icones/IcoDemarrer.js";
import { IcoServeurs } from "../../interface/icones/IcoServeurs.js";
import { statutBadgeDepuisChaineApi } from "../../interface/statutBadgeInstanceJeux.js";
import { construireAdresseConnexionJeux } from "../construire-adresse-connexion-jeux-depuis-navigateur.js";
import { useHotePublicConnexionJeux } from "../../interface/FournisseurHotePublicConnexionJeux.js";

type PropsCarteServeur = {
  instance: InstanceServeurJeuxPasserelle;
  surMiseAJourListe: () => void;
  /** Remplace une ligne sans recharger toute la liste après une action de pilotage. */
  surMiseAJourPartielle?: (instance: InstanceServeurJeuxPasserelle) => void;
};

function classeCarteServeurPourStatut(statut: ReturnType<typeof statutBadgeDepuisChaineApi>): string {
  return `kp-carte-serveur kp-carte-serveur--${statut}`;
}

/** Carte récapitulative d’une instance jeu avec pilotage rapide et liens utiles. */
export function CarteServeur({
  instance,
  surMiseAJourListe,
  surMiseAJourPartielle,
}: PropsCarteServeur) {
  const { pousserToast } = useToastKidoPanel();
  const { hotePublicPourJeux } = useHotePublicConnexionJeux();
  const statutBadge = statutBadgeDepuisChaineApi(instance.status);
  const [patient, setPatient] = useState(false);
  const refDialogSuppression = useRef<HTMLDialogElement>(null);
  const cheminDetail = `/serveurs/${encodeURIComponent(instance.id)}`;
  const peutAfficherSuppressionListe =
    instance.status !== "INSTALLING" &&
    instance.status !== "RUNNING" &&
    instance.status !== "STARTING" &&
    instance.status !== "STOPPING";

  const executerDemarrage = async (evt: MouseEvent<HTMLButtonElement>) => {
    evt.preventDefault();
    evt.stopPropagation();
    setPatient(true);
    try {
      const maj = await demarrerInstanceServeurJeuxPasserelle(instance.id);
      if (surMiseAJourPartielle !== undefined) {
        surMiseAJourPartielle(maj);
      } else {
        surMiseAJourListe();
      }
      pousserToast("Ordre de démarrage envoyé.", "succes");
    } catch (e) {
      pousserToast(e instanceof Error ? e.message : "Démarrage impossible.", "erreur");
    } finally {
      setPatient(false);
    }
  };

  const ouvrirSuppression = (evt: MouseEvent<HTMLButtonElement>) => {
    evt.preventDefault();
    evt.stopPropagation();
    refDialogSuppression.current?.showModal();
  };

  const confirmerSuppression = async () => {
    refDialogSuppression.current?.close();
    setPatient(true);
    try {
      await supprimerInstanceServeur(instance.id);
      pousserToast("Instance supprimée.", "succes");
      surMiseAJourListe();
    } catch (e) {
      pousserToast(e instanceof Error ? e.message : "Suppression impossible.", "erreur");
    } finally {
      setPatient(false);
    }
  };

  const executerArret = async (evt: MouseEvent<HTMLButtonElement>) => {
    evt.preventDefault();
    evt.stopPropagation();
    setPatient(true);
    try {
      const maj = await arreterInstanceServeurJeuxPasserelle(instance.id);
      if (surMiseAJourPartielle !== undefined) {
        surMiseAJourPartielle(maj);
      } else {
        surMiseAJourListe();
      }
      pousserToast("Ordre d’arrêt envoyé.", "succes");
    } catch (e) {
      pousserToast(e instanceof Error ? e.message : "Arrêt impossible.", "erreur");
    } finally {
      setPatient(false);
    }
  };

  return (
    <article className={classeCarteServeurPourStatut(statutBadge)}>
      <div className="kp-carte-serveur__entete">
        <div style={{ minWidth: 0 }}>
          <Link to={cheminDetail} className="kp-lien-inline" style={{ textDecoration: "none" }}>
            <h3 className="kp-carte-serveur__nom">{instance.name}</h3>
          </Link>
          <p className="kp-carte-serveur__type">
            <IcoServeurs size={14} className="kp-carte-serveur__icone-jeu" aria-hidden />
            {instance.gameType}
          </p>
        </div>
        <BadgeStatut statut={statutBadge} />
      </div>

      <BarreRessource
        etiquette="RAM (quota)"
        valeurTexte={`${String(instance.memoryMb)} Mo`}
        variante="ram"
      />
      <BarreRessource
        etiquette="CPU (cœurs)"
        valeurTexte={`${String(instance.cpuCores)} cœur(s)`}
        variante="cpu"
      />

      <p className="kp-texte-muted" style={{ fontSize: "0.78rem", margin: 0 }}>
        Port principal (hôte) :{" "}
        <span className="kp-cellule-mono">
          {typeof instance.port === "number" ? String(instance.port) : "—"}
        </span>
      </p>
      {instance.status === "RUNNING" && typeof instance.port === "number" ? (
        <p className="kp-texte-muted" style={{ fontSize: "0.78rem", margin: 0 }}>
          Connexion :{" "}
          <span className="kp-cellule-mono">
            {construireAdresseConnexionJeux({
              port: instance.port,
              hotePublicConfigurePasserelle: hotePublicPourJeux,
            })}
          </span>
        </p>
      ) : null}

      <div className="kp-carte-serveur__actions">
        {(instance.status === "STOPPED" ||
          instance.status === "ERROR" ||
          instance.status === "CRASHED") ? (
          <button
            type="button"
            className="kp-btn-ico"
            disabled={patient}
            aria-label="Démarrer l’instance"
            onClick={executerDemarrage}
          >
            <IcoDemarrer size={15} />
          </button>
        ) : null}
        {instance.status === "RUNNING" ? (
          <button
            type="button"
            className="kp-btn-ico"
            disabled={patient}
            aria-label="Arrêter l’instance"
            onClick={executerArret}
          >
            <IcoArret size={14} />
          </button>
        ) : null}
        {instance.status !== "INSTALLING" ? (
          <Link
            to={cheminDetail}
            className="kp-btn-ico"
            aria-label="Voir le détail et la console"
            onClick={(e) => e.stopPropagation()}
          >
            <IcoConsoleJeux size={15} />
          </Link>
        ) : null}
      </div>

      {peutAfficherSuppressionListe ? (
        <div style={{ marginTop: "0.45rem" }}>
          <button
            type="button"
            className="kp-btn kp-btn--danger kp-btn--sm"
            disabled={patient}
            style={{ width: "100%" }}
            onClick={ouvrirSuppression}
          >
            Supprimer l’instance
          </button>
        </div>
      ) : null}

      <DialogueSuppressionInstanceServeur
        refDialogue={refDialogSuppression}
        patient={patient}
        surAnnuler={() => refDialogSuppression.current?.close()}
        surConfirmer={confirmerSuppression}
      />
    </article>
  );
}
