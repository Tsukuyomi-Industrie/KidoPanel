import { Navigate, Outlet } from "react-router-dom";
import { lireJetonStockage } from "../lab/passerelleClient.js";

/**
 * Redirige vers la page de connexion si aucun jeton n’est présent dans le stockage configuré.
 */
export function GardeAuthentificationKidoPanel() {
  if (lireJetonStockage().trim() === "") {
    return <Navigate to="/connexion" replace />;
  }
  return <Outlet />;
}
