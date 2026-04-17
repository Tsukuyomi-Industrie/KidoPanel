import { Outlet } from "react-router-dom";
import { GestionConteneursPasserelleProvider } from "../coeur-docker/GestionConteneursPasserelleProvider.js";

/**
 * Enveloppe des écrans Docker : partage l’état liste / création / journaux entre les routes enfants.
 */
export function LayoutConteneursDocker() {
  return (
    <GestionConteneursPasserelleProvider>
      <Outlet />
    </GestionConteneursPasserelleProvider>
  );
}
