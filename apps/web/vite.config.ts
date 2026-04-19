import { readFileSync } from "node:fs";
import type { ClientRequest, IncomingMessage } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { CHEMIN_PROXY_PASSERELLE_DEV } from "./src/config/chemin-proxy-passerelle-dev";

const racinePackageWeb = path.dirname(fileURLToPath(import.meta.url));
const versionPackageWeb = JSON.parse(
  readFileSync(path.join(racinePackageWeb, "package.json"), "utf8"),
) as { version?: string };

/**
 * Proxy dev : le navigateur appelle uniquement l’origine Vite ; plus de `fetch` direct vers
 * `127.0.0.1:3000` depuis une machine distante (où 127.0.0.1 désigne le poste client).
 * `root` / `envDir` / `loadEnv` sont ancrés sur ce répertoire pour que `pnpm` lancé depuis
 * la racine du monorepo charge bien `apps/web/.env` (sinon la cible du proxy reste opaque).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, racinePackageWeb, "");
  const ciblePasserelle =
    env.VITE_GATEWAY_PROXY_TARGET?.trim() || "http://127.0.0.1:3000";

  const proxyPasserelle = {
    [CHEMIN_PROXY_PASSERELLE_DEV]: {
      target: ciblePasserelle,
      changeOrigin: true,
      /** Création d’instance (ex. pull d’image Docker) : délai longue pour éviter la coupure prématurée du proxy. */
      timeout: 1_800_000,
      proxyTimeout: 1_800_000,
      rewrite: (chemin: string) => {
        const suite = chemin.slice(CHEMIN_PROXY_PASSERELLE_DEV.length) || "/";
        return suite.startsWith("/") ? suite : `/${suite}`;
      },
      /**
       * Sans en-tête, la passerelle ne voit que `Host: 127.0.0.1:3000` (cible du proxy) : l’adresse « connexion jeu »
       * retombe en loopback. On propage le `Host` du navigateur (`IP:5173`, domaine, etc.) pour `GET /panel/adresse-connexion-jeux`.
       */
      configure: (proxy: {
        on(
          ev: "proxyReq",
          fn: (proxyReq: ClientRequest, req: IncomingMessage) => void,
        ): void;
      }) => {
        proxy.on("proxyReq", (proxyReq, req) => {
          const client = req.headers.host;
          let brut = "";
          if (typeof client === "string") {
            brut = client;
          } else if (Array.isArray(client)) {
            brut = client[0] ?? "";
          }
          if (
            brut.trim().length > 0 &&
            proxyReq.getHeader("x-forwarded-host") === undefined
          ) {
            proxyReq.setHeader("X-Forwarded-Host", brut.trim());
          }
        });
      },
    },
  };

  return {
    root: racinePackageWeb,
    envDir: racinePackageWeb,
    define: {
      __KP_PANEL_VERSION__: JSON.stringify(versionPackageWeb.version ?? "0.0.0"),
    },
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
