import { serve } from "@hono/node-server";
import { ContainerEngine } from "./container-engine.js";
import { createEngineHttpApp } from "./http/create-app.js";

const port = Number(
  process.env.CONTAINER_ENGINE_PORT ?? process.env.PORT ?? 8787,
);

if (!Number.isFinite(port) || port < 1 || port > 65_535) {
  console.error(
    "[container-engine] Port invalide (CONTAINER_ENGINE_PORT ou PORT).",
  );
  process.exitCode = 1;
} else {
  const engine = new ContainerEngine();
  const app = createEngineHttpApp(engine);

  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.log(
        `[container-engine] API HTTP à l’écoute sur le port ${String(info.port)}.`,
      );
    },
  );
}
