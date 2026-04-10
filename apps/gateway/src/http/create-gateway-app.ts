import { Hono } from "hono";
import { loadGatewayEnv } from "../config/gateway-env.js";
import { jwtAuthReadyMiddleware } from "./middleware/jwt-auth.middleware.js";
import { requestLogMiddleware } from "./middleware/request-log.middleware.js";
import { creerMiddlewareRateLimit } from "./middleware/rate-limit.middleware.js";
import { monterRoutesProxyConteneurs } from "./routes/containers-proxy.routes.js";
import { monterRoutesRacineEtSante } from "./routes/root-and-health.routes.js";

/** Assemble l’application Hono : journalisation, limitation, JWT optionnel, proxy moteur. */
export function createGatewayApp(): Hono {
  const env = loadGatewayEnv();
  const app = new Hono();

  app.use("*", requestLogMiddleware);
  app.use(
    "*",
    creerMiddlewareRateLimit(env.rateLimitMax, env.rateLimitWindowMs),
  );
  app.use("*", jwtAuthReadyMiddleware);

  monterRoutesRacineEtSante(app);
  monterRoutesProxyConteneurs(app);

  app.notFound((c) =>
    c.json(
      {
        error: {
          code: "ROUTE_NOT_FOUND",
          message: "Route HTTP introuvable sur la passerelle.",
        },
      },
      404,
    ),
  );

  app.onError((erreur, c) => {
    console.error("[gateway] Erreur non gérée :", erreur);
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Erreur interne de la passerelle.",
        },
      },
      500,
    );
  });

  return app;
}
