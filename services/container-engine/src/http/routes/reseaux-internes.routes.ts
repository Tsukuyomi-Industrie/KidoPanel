import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { ContainerEngine } from "../../container-engine.js";
import { journaliserMoteur } from "../../observabilite/journal-json.js";
import { tryRespondWithEngineError } from "../respond-route-error.js";
import type { VariablesMoteurHttp } from "../variables-moteur-http.js";
import {
  corpsCreationReseauInterneMoteurSchema,
  suppressionReseauInterneQuerySchema,
} from "../schemas/reseaux-internes-corps.schema.js";

/** Routes HTTP des ponts réseau utilisateur : création IPAM Docker et suppression contrôlée. */
export function mountReseauxInternesRoutes(
  app: Hono<{ Variables: VariablesMoteurHttp }>,
  engine: ContainerEngine,
): void {
  app.post(
    "/reseaux-internes",
    zValidator("json", corpsCreationReseauInterneMoteurSchema),
    async (c) => {
      const corps = c.req.valid("json");
      try {
        const normalise = await engine.creerReseauPontUtilisateur(
          {
            nomDocker: corps.nomDocker,
            sousReseauCidr: corps.sousReseauCidr,
            passerelleIpv4: corps.passerelleIpv4,
            sansRouteVersInternetExterne: corps.sansRouteVersInternetExterne,
            pontBridgeDocker: corps.pontBridgeDocker,
          },
          { requestId: c.get("requestId") },
        );
        journaliserMoteur({
          niveau: "info",
          message: "route_reseau_interne_utilisateur_cree",
          requestId: c.get("requestId"),
          metadata: { nomDocker: corps.nomDocker },
        });
        return c.json(normalise, 201);
      } catch (error_) {
        const response = tryRespondWithEngineError(c, error_);
        if (response) return response;
        throw error_;
      }
    },
  );

  app.delete(
    "/reseaux-internes",
    zValidator("query", suppressionReseauInterneQuerySchema),
    async (c) => {
      const { nomDocker } = c.req.valid("query");
      try {
        await engine.supprimerReseauPontUtilisateurParNom(nomDocker, {
          requestId: c.get("requestId"),
        });
        return c.body(null, 204);
      } catch (error_) {
        const response = tryRespondWithEngineError(c, error_);
        if (response) return response;
        throw error_;
      }
    },
  );
}
