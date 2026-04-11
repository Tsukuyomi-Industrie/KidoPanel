import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { CHEMIN_PROXY_PASSERELLE_DEV } from "./src/config/chemin-proxy-passerelle-dev";

/**
 * Proxy dev : le navigateur appelle uniquement l’origine Vite ; plus de `fetch` direct vers
 * `127.0.0.1:3000` depuis une machine distante (où 127.0.0.1 désigne le poste client).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const ciblePasserelle =
    env.VITE_GATEWAY_PROXY_TARGET?.trim() || "http://127.0.0.1:3000";

  const proxyPasserelle = {
    [CHEMIN_PROXY_PASSERELLE_DEV]: {
      target: ciblePasserelle,
      changeOrigin: true,
      rewrite: (chemin: string) => {
        const suite = chemin.slice(CHEMIN_PROXY_PASSERELLE_DEV.length) || "/";
        return suite.startsWith("/") ? suite : `/${suite}`;
      },
    },
  };

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: false,
      allowedHosts: true,
      proxy: proxyPasserelle,
    },
    preview: {
      host: "0.0.0.0",
      port: 4173,
      proxy: proxyPasserelle,
    },
  };
});
