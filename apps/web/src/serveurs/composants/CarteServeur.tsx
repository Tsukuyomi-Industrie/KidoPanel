import { useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  arreterInstanceServeurJeuxPasserelle,
  demarrerInstanceServeurJeuxPasserelle,
  type InstanceServeurJeuxPasserelle,
} from "../../passerelle/serviceServeursJeuxPasserelle.js";
import { BadgeStatut } from "../../interface/BadgeStatut.js";
import { useToastKidoPanel } from "../../interface/useToastKidoPanel.js";
import { BarreRessource } from "../../interface/BarreRessource.js";
import { IcoArret } from "../../interface/icones/IcoArret.js";
import { IcoConsoleJeux } from "../../interface/icones/IcoConsoleJeux.js";
import { IcoDemarrer } from "../../interface/icones/IcoDemarrer.js";
import { IcoServeurs } from "../../interface/icones/IcoServeurs.js";
import { statutBadgeDepuisChaineApi } from "../../interface/statutBadgeInstanceJeux.js";

type PropsCarteServeur = {
  instance: InstanceServeurJeuxPasserelle;
  surMiseAJourListe: () => void;
};

function classeCarteServeurPourStatut(statut: ReturnType<typeof statutBadgeDepuisChaineApi>): string {
  return `kp-carte-serveur kp-carte-serveur--${statut}`;
}

/** Carte récapitulative d’une instance jeu avec pilotage rapide et liens utiles. */
export function CarteServeur({ instance, surMiseAJourListe }: PropsCarteServeur) {
  const { pousserToast } = useToastKidoPanel();
  const statutBadge = statutBadgeDepuisChaineApi(instance.status);
  const [patient, setPatient] = useState(false);
  const cheminDetail = `/serveurs/${encodeURIComponent(instance.id)}`;

  const executerDemarrage = async (evt: MouseEvent<HTMLButtonElement>) => {
    evt.preventDefault();
    evt.stopPropagation();
    setPatient(true);
    try {
      await demarrerInstanceServeurJeuxPasserelle(instance.id);
      surMiseAJourListe();
      pousserToast("Ordre de démarrage envoyé.", "succes");
    } catch (e) {
      pousserToast(e instanceof Error ? e.message : "Démarrage impossible.", "erreur");
    } finally {
      setPatient(false);
    }
  };

  const executerArret = async (evt: MouseEvent<HTMLButtonElement>) => {
    evt.preventDefault();
    evt.stopPropagation();
    setPatient(true);
    try {
      await arreterInstanceServeurJeuxPasserelle(instance.id);
      surMiseAJourListe();
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
        Port principal : <span className="kp-cellule-mono">—</span>
      </p>

      <div className="kp-carte-serveur__actions">
        <button
          type="button"
          className="kp-btn-ico"
          disabled={patient}
          aria-label="Démarrer l’instance"
          onClick={executerDemarrage}
        >
          <IcoDemarrer size={15} />
        </button>
        <button
          type="button"
          className="kp-btn-ico"
          disabled={patient}
          aria-label="Arrêter l’instance"
          onClick={executerArret}
        >
          <IcoArret size={14} />
        </button>
        <Link
          to={cheminDetail}
          className="kp-btn-ico"
          aria-label="Ouvrir la console"
          onClick={(e) => e.stopPropagation()}
        >
          <IcoConsoleJeux size={15} />
        </Link>
      </div>
    </article>
  );
}
