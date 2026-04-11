import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Configuration Vite pour l’application React du panel.
 * host + allowedHosts : accès distant (VPS, LAN) ; sans cela, seul localhost est servi ou l’en-tête Host est refusé.
 * En production, servir le build statique derrière un reverse proxy, pas ce serveur de dev.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    allowedHosts: true,
  },
});
