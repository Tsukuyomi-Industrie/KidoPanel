import type { Hono } from "hono";
import { forwardRequestToContainerEngine } from "../proxy/container-engine-proxy.js";

/**
 * Route racine (identité de la passerelle) et santé relayée vers le moteur de conteneurs.
 */
export function monterRoutesRacineEtSante(app: Hono): void {
  app.get("/", (c) =>
    c.json({
      service: "gateway",
      description:
        "Point d’entrée HTTP unique pour le panel ; relais vers les services métier sans accès Docker.",
    }),
  );

  app.get("/health", (c) => forwardRequestToContainerEngine(c));
}
