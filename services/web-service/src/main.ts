import "@kidopanel/database/charger-env-racine-monorepo";
import {
  creerJournalPretServeHttp,
  journaliserRefusDemarrageConfigurationHttp,
} from "@kidopanel/database";
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
  journaliserRefusDemarrageConfigurationHttp(error_);
}

if (application) {
  serve(
    {
      fetch: application.fetch,
      port,
      hostname: adresseEcoute,
    },
    creerJournalPretServeHttp({ cleMessage: "web_service_http_pret" }),
  );
}
