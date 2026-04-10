import type { Hono } from "hono";
import { forwardRequestToContainerEngine } from "../proxy/container-engine-proxy.js";

/**
 * Proxy REST des conteneurs vers le container-engine (mêmes chemins et sémantique HTTP).
 */
export function monterRoutesProxyConteneurs(app: Hono): void {
  app.get("/containers", (c) => forwardRequestToContainerEngine(c));
  app.post("/containers", (c) => forwardRequestToContainerEngine(c));
  app.post("/containers/:id/start", (c) =>
    forwardRequestToContainerEngine(c),
  );
  app.post("/containers/:id/stop", (c) =>
    forwardRequestToContainerEngine(c),
  );
  app.delete("/containers/:id", (c) =>
    forwardRequestToContainerEngine(c),
  );
  app.get("/containers/:id/logs", (c) =>
    forwardRequestToContainerEngine(c),
  );
}
