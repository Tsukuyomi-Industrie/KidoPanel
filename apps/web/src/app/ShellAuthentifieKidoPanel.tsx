import { Outlet, useNavigate } from "react-router-dom";
import { EnteteSessionKidoPanel } from "../interface/EnteteSessionKidoPanel.js";
import { RailNavigationKidoPanel } from "../interface/RailNavigationKidoPanel.js";
import { effacerToutJetonPasserelle } from "../passerelle/jetonPasserelleStockage.js";
import { extraireEmailDepuisJetonClient } from "../passerelle/lectureEmailJetonClient.js";
import { extraireRoleDepuisJetonClient } from "../passerelle/lectureRoleJetonClient.js";
import { lireJetonStockage } from "../lab/passerelleClient.js";
import { FournisseurHotePublicConnexionJeux } from "../interface/FournisseurHotePublicConnexionJeux.js";

/**
 * Coque authentifiée : barre fixe et zone de contenu pour les routes protégées.
 */
export function ShellAuthentifieKidoPanel() {
  const navigate = useNavigate();
  const jeton = lireJetonStockage();
  const emailAffiche = extraireEmailDepuisJetonClient(jeton) ?? "Compte authentifié";
  const roleSession = extraireRoleDepuisJetonClient(jeton);

  return (
    <FournisseurHotePublicConnexionJeux>
      <div className="kp-coque">
        <RailNavigationKidoPanel
          emailAffiche={emailAffiche}
          roleSession={roleSession}
          surDeconnexion={() => {
            effacerToutJetonPasserelle();
            navigate("/connexion", { replace: true });
          }}
        />
        <div className="kp-colonne-travail">
          <EnteteSessionKidoPanel roleSession={roleSession} />
          <main className="kp-corps">
            <div className="kp-contenu">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </FournisseurHotePublicConnexionJeux>
  );
}
