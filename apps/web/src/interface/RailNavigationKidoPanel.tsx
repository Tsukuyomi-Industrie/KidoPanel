import { NavLink } from "react-router-dom";

type PropsRailNavigationKidoPanel = {
  surDeconnexion: () => void;
};

const classeLienRail = ({ isActive }: { isActive: boolean }): string =>
  `kidopanel-rail__lien${isActive ? " kidopanel-rail__lien--actif" : ""}`;

/**
 * Rail latéral fixe : entrées de navigation métier et sortie de session regroupées pour une lecture verticale stable.
 */
export function RailNavigationKidoPanel({ surDeconnexion }: PropsRailNavigationKidoPanel) {
  return (
    <aside className="kidopanel-rail" aria-label="Navigation du panel">
      <div className="kidopanel-rail__haut">
        <NavLink to="/" className="kidopanel-rail__marque" end>
          <span className="kidopanel-rail__marque-texte">KidoPanel</span>
          <span className="kidopanel-rail__marque-badge">PaaS</span>
        </NavLink>
        <nav className="kidopanel-rail__liste" aria-label="Sections principales">
          <NavLink to="/" end className={classeLienRail}>
            Tableau de bord
          </NavLink>
          <NavLink to="/coeur-docker" className={classeLienRail}>
            Cœur Docker
          </NavLink>
          <NavLink to="/coeur-docker/nouveau" className={classeLienRail}>
            Nouveau conteneur
          </NavLink>
          <NavLink to="/parametres" className={classeLienRail}>
            Paramètres
          </NavLink>
        </nav>
      </div>
      <div className="kidopanel-rail__bas">
        <button type="button" className="kidopanel-rail__deconnexion" onClick={surDeconnexion}>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
