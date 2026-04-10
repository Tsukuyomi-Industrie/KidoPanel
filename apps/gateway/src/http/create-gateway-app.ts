import { Hono } from "hono";
import { prisma } from "@kidopanel/database";
import { ServiceAuth } from "../auth/auth.service.js";
import { ContainerOwnershipRepository } from "../auth/container-ownership-repository.prisma.js";
import { UserRepository } from "../auth/user-repository.prisma.js";
import {
  encoderSecretJwt,
  loadGatewayEnv,
} from "../config/gateway-env.js";
import { monterRoutesAuth } from "./routes/auth.routes.js";
import { monterRoutesProxyConteneurs } from "./routes/containers-proxy.routes.js";
import { monterRoutesRacineEtSante } from "./routes/root-and-health.routes.js";
import { creerMiddlewareRateLimit } from "./middleware/rate-limit.middleware.js";
import { requestLogMiddleware } from "./middleware/request-log.middleware.js";

/** Assemble l’application Hono : journalisation, limitation, auth, proxy moteur cloisonné. */
export function createGatewayApp(): Hono {
  const env = loadGatewayEnv();
  const secretJwt = encoderSecretJwt(env);
  const userRepository = new UserRepository(prisma);
  const depotPropriete = new ContainerOwnershipRepository(prisma);
  const serviceAuth = new ServiceAuth({
    userRepository,
    secretJwt,
    expirationSecondes: env.jwtExpiresSeconds,
    coutBcrypt: env.bcryptCost,
  });

  const app = new Hono();

  app.use("*", requestLogMiddleware);
  app.use(
    "*",
    creerMiddlewareRateLimit(env.rateLimitMax, env.rateLimitWindowMs),
  );

  monterRoutesRacineEtSante(app);
  monterRoutesAuth(app, serviceAuth);
  monterRoutesProxyConteneurs(app, secretJwt, depotPropriete);

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
