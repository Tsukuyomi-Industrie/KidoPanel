import { useLocation } from "react-router-dom";
import type { RoleUtilisateurJetonClient } from "../passerelle/lectureRoleJetonClient.js";
import { segmentsFilArianeDepuisChemin } from "./segmentsFilArianeRoute.js";

type PropsEnteteSessionKidoPanel = {
  roleSession?: RoleUtilisateurJetonClient | null;
};

/**
 * Topbar : fil d’Ariane déduit de la route, indicateur de santé affiché et badge de rôle.
 */
export function EnteteSessionKidoPanel({ roleSession }: PropsEnteteSessionKidoPanel) {
  const { pathname } = useLocation();
  const segments = segmentsFilArianeDepuisChemin(pathname);

  return (
    <header className="kp-topbar">
      <nav className="kp-topbar__ariane" aria-label="Fil d’Ariane">
        {segments.map((libelle, index) => (
          <span key={`${String(index)}-${libelle}`}>
            {index > 0 ? (
              <span className="kp-topbar__ariane-sep" aria-hidden="true">
                /
              </span>
            ) : null}
            {index === segments.length - 1 ? (
              <span className="kp-topbar__ariane-page">{libelle}</span>
            ) : (
              <span>{libelle}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="kp-topbar__droite">
        <div className="kp-topbar__statut">
          <span className="kp-topbar__statut-point" aria-hidden="true" />
          <span>Système opérationnel</span>
        </div>
        <span
          className={`kp-badge-role ${roleSession === "ADMIN" ? "kp-badge-role--admin" : "kp-badge-role--user"}`}
        >
          {roleSession === "ADMIN" ? "Admin" : "Utilisateur"}
        </span>
      </div>
    </header>
  );
}
