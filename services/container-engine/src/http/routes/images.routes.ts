import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { construireReponseListeCatalogueImages } from "@kidopanel/container-catalog";
import type { ContainerEngine } from "../../container-engine.js";
import { journaliserErreurMoteur } from "../../observabilite/journal-json.js";
import { tryRespondWithEngineError } from "../respond-route-error.js";
import { suggestionImageQuerySchema } from "../schemas/image-suggestion-query.schema.js";
import type { VariablesMoteurHttp } from "../variables-moteur-http.js";

/**
 * Catalogue figé et suggestion de configuration minimale à partir de l’inspection d’image Docker.
 */
export function mountImagesRoutes(
  app: Hono<{ Variables: VariablesMoteurHttp }>,
  engine: ContainerEngine,
): void {
  app.get("/images", (c) => c.json(construireReponseListeCatalogueImages()));

  app.get(
    "/images/suggestion",
    zValidator("query", suggestionImageQuerySchema),
    async (c) => {
      const q = c.req.valid("query");
      try {
        const suggestion = await engine.obtenirSuggestionConfigurationPourImageDocker(
          {
            imageCatalogId: q.imageCatalogId,
            imageReference: q.imageReference,
          },
          { requestId: c.get("requestId") },
        );
        return c.json(suggestion);
      } catch (err) {
        const response = tryRespondWithEngineError(c, err);
        if (response) return response;
        journaliserErreurMoteur(
          "suggestion_image_echec_inattendu",
          err,
          c.get("requestId"),
        );
        throw err;
      }
    },
  );
}
