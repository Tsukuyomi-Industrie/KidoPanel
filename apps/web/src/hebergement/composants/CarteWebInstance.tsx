import { useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { BadgeStatut } from "../../interface/BadgeStatut.js";
import { useToastKidoPanel } from "../../interface/useToastKidoPanel.js";
import { statutBadgeDepuisChaineApi } from "../../interface/statutBadgeInstanceJeux.js";
import {
  arreterWebInstancePasserelle,
  demarrerWebInstancePasserelle,
  type WebInstancePasserelle,
} from "../../passerelle/serviceWebInstancesPasserelle.js";
import { IcoArret } from "../../interface/icones/IcoArret.js";
import { IcoDemarrer } from "../../interface/icones/IcoDemarrer.js";

type PropsCarteWebInstance = {
  readonly instance: WebInstancePasserelle;
  readonly surMiseAJourListe: () => void;
  readonly surMiseAJourPartielle?: (instance: WebInstancePasserelle) => void;
};

/** Résumé d’une instance web avec actions rapides et domaines associés. */
export function CarteWebInstance({
  instance,
  surMiseAJourListe,
  surMiseAJourPartielle,
}: PropsCarteWebInstance) {
  const { pousserToast } = useToastKidoPanel();
  const [patient, setPatient] = useState(false);
  const statutBadge = statutBadgeDepuisChaineApi(instance.status);
  const cheminDetail = `/hebergement/containers/${encodeURIComponent(instance.id)}`;
  const domainesLie = instance.domaines ?? [];

  const apresPilotage = (maj: WebInstancePasserelle) => {
    if (surMiseAJourPartielle === undefined) {
      surMiseAJourListe();
    } else {
      surMiseAJourPartielle(maj);
    }
  };

  const executerDemarrage = async (evt: MouseEvent<HTMLButtonElement>) => {
    evt.preventDefault();
    evt.stopPropagation();
    setPatient(true);
    try {
      const maj = await demarrerWebInstancePasserelle(instance.id);
      apresPilotage(maj);
      pousserToast("Ordre de démarrage envoyé.", "succes");
    } catch (error_) {
      pousserToast(error_ instanceof Error ? error_.message : "Démarrage impossible.", "erreur");
    } finally {
      setPatient(false);
    }
  };

  const executerArret = async (evt: MouseEvent<HTMLButtonElement>) => {
    evt.preventDefault();
    evt.stopPropagation();
    setPatient(true);
    try {
      const maj = await arreterWebInstancePasserelle(instance.id);
      apresPilotage(maj);
      pousserToast("Ordre d’arrêt envoyé.", "succes");
    } catch (error_) {
      pousserToast(error_ instanceof Error ? error_.message : "Arrêt impossible.", "erreur");
    } finally {
      setPatient(false);
    }
  };

  return (
    <article className="kp-dash-carte">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
        <div style={{ minWidth: 0 }}>
          <Link to={cheminDetail} className="kp-lien-inline">
            <h3 className="kp-page-titre" style={{ fontSize: "1.05rem", margin: 0 }}>
              {instance.name}
            </h3>
          </Link>
          <p className="kp-texte-muted" style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}>
            <span className="kp-cellule-mono">{instance.techStack}</span>
          </p>
        </div>
        <BadgeStatut statut={statutBadge} />
      </div>
      <p style={{ margin: "0.5rem 0" }}>
        RAM allouée : <strong>{String(instance.memoryMb)} Mo</strong>
      </p>
      {domainesLie.length > 0 ? (
        <p className="kp-texte-muted" style={{ fontSize: "0.82rem", margin: "0 0 0.75rem" }}>
          Domaines :{" "}
          <span className="kp-cellule-mono">
            {domainesLie
              .slice(0, 3)
              .map((d) => d.domaine)
              .join(", ")}
            {domainesLie.length > 3 ? "…" : ""}
          </span>
        </p>
      ) : (
        <p className="kp-texte-muted" style={{ fontSize: "0.82rem" }}>
          Aucun domaine proxy lié pour l’instant.
        </p>
      )}
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
        {instance.status === "STOPPED" || instance.status === "ERROR" ? (
          <button
            type="button"
            className="kp-btn-ico"
            disabled={patient}
            aria-label="Démarrer"
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
            aria-label="Arrêter"
            onClick={executerArret}
          >
            <IcoArret size={14} />
          </button>
        ) : null}
        <Link to={`${cheminDetail}?logs=1`} className="kp-btn kp-btn--ghost kp-btn--sm">
          Logs
        </Link>
      </div>
    </article>
  );
}
