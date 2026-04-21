import { monterRelaiServiceAuthentifie } from "./relai-service-authentifie.routes.js";
import { Hono } from "hono";
import type { VariablesGateway } from "../types/gateway-variables.js";

/**
 * Relais JWT vers `web-service` pour le préfixe `/proxy` (domaines et rechargement Nginx).
 */
export function monterRoutesProxyManagerPasserelle(
  app: Hono<{ Variables: VariablesGateway }>,
  secretJwt: Uint8Array,
  urlBaseServiceWeb: string | undefined,
): void {
  monterRelaiServiceAuthentifie({
    app,
    secretJwt,
    routePasserelle: "/proxy",
    prefixeCheminAmont: "/proxy",
    messageSessionRequise: "Session requise pour le gestionnaire de proxy.",
    urlBaseService: urlBaseServiceWeb,
  });
}
