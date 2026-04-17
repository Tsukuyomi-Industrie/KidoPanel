import { Navigate } from "react-router-dom";
import { lireJetonStockage } from "../lab/passerelleClient.js";
import { PageAuthentificationKidoPanel } from "../interface/PageAuthentificationKidoPanel.js";

/**
 * Affiche la page de connexion ou redirige vers le tableau de bord si un jeton est déjà présent.
 */
export function RouteConnexionKidoPanel() {
  if (lireJetonStockage().trim() !== "") {
    return <Navigate to="/" replace />;
  }
  return <PageAuthentificationKidoPanel />;
}
