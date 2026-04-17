import { Navigate, Route, Routes } from "react-router-dom";
import { PageTableauBordKidoPanel } from "../interface/PageTableauBordKidoPanel.js";
import { PageParametresCompteKidoPanel } from "../interface/PageParametresCompteKidoPanel.js";
import { PageCoeurDockerKidoPanel } from "../coeur-docker/PageCoeurDockerKidoPanel.js";
import { PageCreationConteneurKidoPanel } from "../coeur-docker/PageCreationConteneurKidoPanel.js";
import { GardeAuthentificationKidoPanel } from "./GardeAuthentificationKidoPanel.js";
import { LayoutConteneursDocker } from "./LayoutConteneursDocker.js";
import { RouteConnexionKidoPanel } from "./RouteConnexionKidoPanel.js";
import { ShellAuthentifieKidoPanel } from "./ShellAuthentifieKidoPanel.js";
import { extraireEmailDepuisJetonClient } from "../passerelle/lectureEmailJetonClient.js";
import { lireJetonStockage } from "../lab/passerelleClient.js";

function PageAccueilAvecEmail() {
  const jeton = lireJetonStockage();
  const email = extraireEmailDepuisJetonClient(jeton) ?? "Compte authentifié";
  return <PageTableauBordKidoPanel emailUtilisateur={email} />;
}

/**
 * Arborescence des routes : connexion publique, puis espace authentifié avec Docker et paramètres.
 */
export function RoutesKidoPanel() {
  return (
    <Routes>
      <Route path="/connexion" element={<RouteConnexionKidoPanel />} />
      <Route element={<GardeAuthentificationKidoPanel />}>
        <Route element={<ShellAuthentifieKidoPanel />}>
          <Route index element={<PageAccueilAvecEmail />} />
          <Route path="parametres" element={<PageParametresCompteKidoPanel />} />
          <Route element={<LayoutConteneursDocker />}>
            <Route path="coeur-docker" element={<PageCoeurDockerKidoPanel />} />
            <Route path="coeur-docker/nouveau" element={<PageCreationConteneurKidoPanel />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
