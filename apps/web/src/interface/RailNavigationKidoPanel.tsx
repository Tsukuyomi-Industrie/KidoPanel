import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import type { RoleUtilisateurJetonClient } from "../passerelle/lectureRoleJetonClient.js";
import { listerInstancesServeursJeuxPasserelle } from "../passerelle/serviceServeursJeuxPasserelle.js";
import { IcoAudit } from "./icones/IcoAudit.js";
import { IcoDeconnexion } from "./icones/IcoDeconnexion.js";
import { IcoDocker } from "./icones/IcoDocker.js";
import { IcoHebergement } from "./icones/IcoHebergement.js";
import { IcoParametres } from "./icones/IcoParametres.js";
import { IcoServeurs } from "./icones/IcoServeurs.js";
import { IcoTableauBord } from "./icones/IcoTableauBord.js";
import { IcoUtilisateurs } from "./icones/IcoUtilisateurs.js";

type PropsRailNavigationKidoPanel = {
  surDeconnexion: () => void;
  roleSession?: RoleUtilisateurJetonClient | null;
  emailAffiche: string;
};

function initialesDepuisCourriel(email: string): string {
  const partie = email.includes("@") ? email.split("@")[0] : email;
  const nettoye = partie.replace(/[^a-zA-ZÀ-ÿ0-9]/g, "");
  const deux = nettoye.slice(0, 2).toUpperCase();
  return deux.length > 0 ? deux : "?";
}

function classeLienRail({ isActive }: { isActive: boolean }): string {
  return `kp-sidebar__lien${isActive ? " kp-sidebar__lien--actif" : ""}`;
}

/**
 * Rail latéral : navigation métier par sections, badge de version et zone compte avec déconnexion.
 */
export function RailNavigationKidoPanel({
  surDeconnexion,
  roleSession,
  emailAffiche,
}: PropsRailNavigationKidoPanel) {
  const afficherLiensAdministration = roleSession === "ADMIN";
  const [nombreServeursJeux, setNombreServeursJeux] = useState<number | undefined>(
    undefined,
  );

  useEffect(() => {
    let vivant = true;
    void listerInstancesServeursJeuxPasserelle()
      .then((liste) => {
        if (vivant) {
          setNombreServeursJeux(liste.length);
        }
      })
      .catch(() => {
        if (vivant) {
          setNombreServeursJeux(undefined);
        }
      });
    return () => {
      vivant = false;
    };
  }, []);

  const initiales = initialesDepuisCourriel(emailAffiche);

  return (
    <aside className="kp-sidebar" aria-label="Navigation du panel">
      <NavLink to="/" className="kp-sidebar__logo" end>
        <span className="kp-sidebar__logo-icone">K</span>
        <span className="kp-sidebar__logo-texte">KidoPanel</span>
        <span className="kp-sidebar__logo-version">{__KP_PANEL_VERSION__}</span>
      </NavLink>

      <div className="kp-sidebar__section">
        <div className="kp-sidebar__section-label">Navigation principale</div>
        <nav className="kp-sidebar__liste" aria-label="Sections principales">
          <NavLink to="/" end className={classeLienRail}>
            <IcoTableauBord className="kp-sidebar__lien-icone" />
            Tableau de bord
          </NavLink>
          <NavLink to="/serveurs" className={classeLienRail}>
            <IcoServeurs className="kp-sidebar__lien-icone" />
            Serveurs de jeu
            {nombreServeursJeux !== undefined ? (
              <span className="kp-sidebar__badge">{String(nombreServeursJeux)}</span>
            ) : null}
          </NavLink>
          <NavLink to="/hebergement" className={classeLienRail}>
            <IcoHebergement className="kp-sidebar__lien-icone" />
            Hébergement web
          </NavLink>
          <NavLink to="/coeur-docker" className={classeLienRail}>
            <IcoDocker className="kp-sidebar__lien-icone" />
            Cœur Docker
          </NavLink>
        </nav>
      </div>

      {afficherLiensAdministration ? (
        <div className="kp-sidebar__section">
          <div className="kp-sidebar__section-label">Administration</div>
          <nav className="kp-sidebar__liste" aria-label="Administration">
            <NavLink to="/admin/utilisateurs" className={classeLienRail}>
              <IcoUtilisateurs className="kp-sidebar__lien-icone" />
              Utilisateurs
            </NavLink>
            <NavLink to="/admin/journal-audit" className={classeLienRail}>
              <IcoAudit className="kp-sidebar__lien-icone" />
              Journal d’audit
            </NavLink>
          </nav>
        </div>
      ) : null}

      <div className="kp-sidebar__section">
        <div className="kp-sidebar__section-label">Compte</div>
        <nav className="kp-sidebar__liste" aria-label="Compte">
          <NavLink to="/parametres" className={classeLienRail}>
            <IcoParametres className="kp-sidebar__lien-icone" />
            Paramètres
          </NavLink>
        </nav>
      </div>

      <div className="kp-sidebar__compte">
        <div className="kp-sidebar__compte-profil">
          <span className="kp-sidebar__compte-avatar" aria-hidden="true">
            {initiales}
          </span>
          <span className="kp-sidebar__compte-email" title={emailAffiche}>
            {emailAffiche}
          </span>
        </div>
        <button type="button" className="kp-sidebar__deconnexion" onClick={surDeconnexion}>
          <IcoDeconnexion size={14} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
