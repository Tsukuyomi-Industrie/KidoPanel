import { serve } from "@hono/node-server";
import {
  journaliserErreurPasserelle,
  journaliserPasserelle,
} from "./observabilite/journal-json.js";
import { createGatewayApp } from "./http/create-gateway-app.js";

const port = Number(process.env.GATEWAY_PORT ?? process.env.PORT ?? 3000);

/** Toutes les interfaces IPv4 : le service accepte les connexions depuis n’importe quelle IP de la machine (dont l’IP publique si le pare-feu ouvre le port). */
const ECOUTE_TOUTES_INTERFACES_IPV4 = "0.0.0.0";

const brutEcoute = process.env.GATEWAY_LISTEN_HOST?.trim();
const adresseEcoute =
  brutEcoute !== undefined && brutEcoute !== ""
    ? brutEcoute
    : ECOUTE_TOUTES_INTERFACES_IPV4;

if (!Number.isFinite(port) || port < 1 || port > 65_535) {
  journaliserPasserelle({
    niveau: "error",
    message: "demarrage_refuse_port_invalide",
    metadata: { portBrut: process.env.GATEWAY_PORT ?? process.env.PORT },
  });
  process.exitCode = 1;
} else {
  let app;
  try {
    app = createGatewayApp();
  } catch (erreur) {
    journaliserErreurPasserelle(
      "demarrage_refuse_configuration",
      erreur,
    );
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
        journaliserPasserelle({
          niveau: "info",
          message: "passerelle_pret",
          metadata: {
            port: info.port,
            adresse: info.address,
          },
        });
      },
    );
  }
}
