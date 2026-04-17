import { Hono } from "hono";
import type { ContainerEngine } from "../container-engine.js";
import { journaliserErreurMoteur } from "../observabilite/journal-json.js";
import {
  middlewareCorrelationRequeteMoteur,
  routeMetriquesMoteur,
} from "./middleware/correlation-requete.middleware.js";
import { tryRespondWithEngineError } from "./respond-route-error.js";
import { mountContainerRoutes } from "./routes/containers.routes.js";
import { mountImagesRoutes } from "./routes/images.routes.js";
import type { VariablesMoteurHttp } from "./variables-moteur-http.js";

/** Construit l’application HTTP Hono branchée sur une instance de `ContainerEngine`. */
export function createEngineHttpApp(engine: ContainerEngine): Hono<{
  Variables: VariablesMoteurHttp;
}> {
  const app = new Hono<{ Variables: VariablesMoteurHttp }>();

  app.use("*", middlewareCorrelationRequeteMoteur);

  app.get("/", (c) => {
    const repertoireJournauxFichier = engine.obtenirRepertoireJournauxFichierConteneur();
    return c.json({
      service: "container-engine",
      description: "API HTTP du moteur de conteneurs KidoPanel",
      journauxFichierConteneur: {
        actif: repertoireJournauxFichier !== undefined,
        repertoireAbsolu: repertoireJournauxFichier ?? null,
      },
    });
  });

  app.get("/health", async (c) => {
    try {
      await engine.ping();
      return c.json({ status: "ok", docker: true });
    } catch (err) {
      const response = tryRespondWithEngineError(c, err);
      if (response) return response;
      journaliserErreurMoteur(
        "sante_docker_echec_inattendu",
        err,
        c.get("requestId"),
      );
      return c.json({ status: "error", docker: false }, 500);
    }
  });

  app.get("/metrics", routeMetriquesMoteur);

  mountContainerRoutes(app, engine);
  mountImagesRoutes(app);

  app.notFound((c) =>
    c.json(
      {
        error: {
          code: "ROUTE_NOT_FOUND",
          message: "Route HTTP introuvable.",
        },
      },
      404,
    ),
  );

  app.onError((err, c) => {
    const response = tryRespondWithEngineError(c, err);
    if (response) return response;
    journaliserErreurMoteur(
      "erreur_http_non_geree",
      err,
      c.get("requestId"),
    );
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Erreur interne du serveur.",
        },
      },
      500,
    );
  });

  return app;
}
