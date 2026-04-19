import "./charger-env-racine-monorepo.js";
import { serve } from "@hono/node-server";
import { creerApplicationWeb } from "./http/create-application-web.js";
import {
  obtenirAdresseEcouteWebService,
  obtenirPortEcouteWebService,
} from "./config/environnement-web-service.js";

const port = obtenirPortEcouteWebService();
const adresseEcoute = obtenirAdresseEcouteWebService();

let application;
try {
  application = creerApplicationWeb();
} catch (error_) {
  console.error(
    JSON.stringify({
      niveau: "error",
      message: "demarrage_refuse_configuration",
      detail:
        error_ instanceof Error ? error_.message : "erreur_initialisation_inconnue",
    }),
  );
  process.exitCode = 1;
}

if (application) {
  serve(
    {
      fetch: application.fetch,
      port,
      hostname: adresseEcoute,
    },
    (info) => {
      console.error(
        JSON.stringify({
          niveau: "info",
          message: "web_service_http_pret",
          port: info.port,
          adresse: info.address,
        }),
      );
    },
  );
}
