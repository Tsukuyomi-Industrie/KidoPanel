import { NavLink } from "react-router-dom";

type PropsBarreApplicationKidoPanel = {
  emailUtilisateur: string;
  surDeconnexion: () => void;
};

const classeLien = ({ isActive }: { isActive: boolean }): string =>
  `barre-app-kido__lien${isActive ? " barre-app-kido__lien--actif" : ""}`;

/**
 * Barre supérieure : navigation principale du panel, libellés en français, état actif par route.
 */
export function BarreApplicationKidoPanel({
  emailUtilisateur,
  surDeconnexion,
}: PropsBarreApplicationKidoPanel) {
  return (
    <header className="barre-app-kido">
      <NavLink to="/" className="barre-app-kido__marque barre-app-kido__marque-lien" end>
        KidoPanel
      </NavLink>
      <nav className="barre-app-kido__actions" aria-label="Navigation principale">
        <span className="barre-app-kido__email">{emailUtilisateur}</span>
        <NavLink to="/" end className={classeLien}>
          Tableau de bord
        </NavLink>
        <NavLink to="/coeur-docker" className={classeLien}>
          Cœur Docker
        </NavLink>
        <NavLink to="/coeur-docker/nouveau" className={classeLien}>
          Nouveau conteneur
        </NavLink>
        <NavLink to="/parametres" className={classeLien}>
          Paramètres
        </NavLink>
        <button type="button" className="bouton-secondaire-kido" onClick={surDeconnexion}>
          Déconnexion
        </button>
      </nav>
    </header>
  );
}
