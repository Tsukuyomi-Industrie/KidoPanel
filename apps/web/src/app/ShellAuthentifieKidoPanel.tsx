import { Outlet, useNavigate } from "react-router-dom";
import { BarreApplicationKidoPanel } from "../interface/BarreApplicationKidoPanel.js";
import { effacerToutJetonPasserelle } from "../passerelle/jetonPasserelleStockage.js";
import { extraireEmailDepuisJetonClient } from "../passerelle/lectureEmailJetonClient.js";
import { lireJetonStockage } from "../lab/passerelleClient.js";

/**
 * Coque authentifiée : barre fixe et zone de contenu pour les routes protégées.
 */
export function ShellAuthentifieKidoPanel() {
  const navigate = useNavigate();
  const jeton = lireJetonStockage();
  const emailAffiche = extraireEmailDepuisJetonClient(jeton) ?? "Compte authentifié";

  return (
    <div className="fond-app-kido kidopanel-shell">
      <BarreApplicationKidoPanel
        emailUtilisateur={emailAffiche}
        surDeconnexion={() => {
          effacerToutJetonPasserelle();
          void navigate("/connexion", { replace: true });
        }}
      />
      <div className="zone-principale-app kidopanel-zone-principale">
        <Outlet />
      </div>
    </div>
  );
}
