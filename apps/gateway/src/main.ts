import { serve } from "@hono/node-server";
import { createGatewayApp } from "./http/create-gateway-app.js";

const port = Number(process.env.GATEWAY_PORT ?? process.env.PORT ?? 3000);

if (!Number.isFinite(port) || port < 1 || port > 65_535) {
  console.error(
    "[gateway] Port invalide (GATEWAY_PORT ou PORT).",
  );
  process.exitCode = 1;
} else {
  const app = createGatewayApp();

  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.log(
        `[gateway] API à l’écoute sur le port ${String(info.port)} (relai vers container-engine).`,
      );
    },
  );
}
