import { serve } from "@hono/node-server";
import { ContainerEngine } from "./container-engine.js";
import { createEngineHttpApp } from "./http/create-app.js";
import {
  journaliserErreurMoteur,
  journaliserMoteur,
} from "./observabilite/journal-json.js";

const port = Number(
  process.env.CONTAINER_ENGINE_PORT ?? process.env.PORT ?? 8787,
);
/**
 * Adresse d’écoute : par défaut localhost (passerelle sur la même machine).
 * Mettre 0.0.0.0 uniquement si le moteur est sur un hôte distinct (et protéger le réseau / pare-feu).
 */
const adresseEcoute =
  process.env.CONTAINER_ENGINE_LISTEN_HOST?.trim() || "127.0.0.1";

if (!Number.isFinite(port) || port < 1 || port > 65_535) {
  journaliserMoteur({
    niveau: "error",
    message: "demarrage_refuse_port_invalide",
    metadata: {
      portBrut:
        process.env.CONTAINER_ENGINE_PORT ?? process.env.PORT ?? undefined,
    },
  });
  process.exitCode = 1;
} else {
  let app;
  try {
    const engine = new ContainerEngine();
    app = createEngineHttpApp(engine);
  } catch (error_) {
    journaliserErreurMoteur("demarrage_refuse_initialisation", error_);
    process.exitCode = 1;
  }

  if (app) {
    serve(
      {
        fetch: app.fetch,
        port,
        hostname: adresseEcoute,
      },
      (info) => {
        journaliserMoteur({
          niveau: "info",
          message: "moteur_http_pret",
          metadata: {
            port: info.port,
            adresse: info.address,
          },
        });
      },
    );
  }
}
