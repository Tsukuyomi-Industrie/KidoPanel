import { monterRelaiServiceAuthentifie } from "./relai-service-authentifie.routes.js";
import { Hono } from "hono";
import type { VariablesGateway } from "../types/gateway-variables.js";

/**
 * Relais HTTP JWT vers `web-service` pour le chemin `/web-instances` (cycle de vie des conteneurs applicatifs).
 */
export function monterRoutesWebInstancesPasserelle(
  app: Hono<{ Variables: VariablesGateway }>,
  secretJwt: Uint8Array,
  urlBaseServiceWeb: string | undefined,
): void {
  monterRelaiServiceAuthentifie({
    app,
    secretJwt,
    routePasserelle: "/web-instances",
    prefixeCheminAmont: "/web-instances",
    messageSessionRequise: "Session requise pour le service web.",
    urlBaseService: urlBaseServiceWeb,
  });
}
