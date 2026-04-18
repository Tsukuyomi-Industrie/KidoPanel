import { Hono } from "hono";
import { construireReponseListeCatalogueImages } from "@kidopanel/container-catalog";
import { creerMiddlewareAuthObligatoire } from "../../auth/auth.middleware.js";
import type { VariablesGateway } from "../types/gateway-variables.js";
import { forwardRequestToContainerEngine } from "../proxy/container-engine-proxy.js";

/**
 * Expose `GET /images` : catalogue autorisé sans Docker ; `GET /images/suggestion` relaie vers le moteur (inspection d’image).
 */
export function monterRouteCatalogueImagesPasserelle(
  app: Hono<{ Variables: VariablesGateway }>,
  secretJwt: Uint8Array,
): void {
  const groupe = new Hono<{ Variables: VariablesGateway }>();
  groupe.use("*", creerMiddlewareAuthObligatoire(secretJwt));
  groupe.get("/", (c) => c.json(construireReponseListeCatalogueImages()));
  groupe.get("/suggestion", (c) => forwardRequestToContainerEngine(c));
  app.route("/images", groupe);
}
