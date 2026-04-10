import { Hono } from "hono";
import type { ContainerEngine } from "../container-engine.js";
import { tryRespondWithEngineError } from "./respond-route-error.js";
import { mountContainerRoutes } from "./routes/containers.routes.js";

/** Construit l’application HTTP Hono branchée sur une instance de `ContainerEngine`. */
export function createEngineHttpApp(engine: ContainerEngine): Hono {
  const app = new Hono();

  app.get("/", (c) =>
    c.json({
      service: "container-engine",
      description: "API HTTP du moteur de conteneurs KidoPanel",
    }),
  );

  app.get("/health", async (c) => {
    try {
      await engine.ping();
      return c.json({ status: "ok", docker: true });
    } catch (err) {
      const response = tryRespondWithEngineError(c, err);
      if (response) return response;
      return c.json({ status: "error", docker: false }, 500);
    }
  });

  mountContainerRoutes(app, engine);

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
    console.error("[container-engine] Erreur non gérée :", err);
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
