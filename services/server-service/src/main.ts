import "@kidopanel/database/charger-env-racine-monorepo";
import {
  creerJournalPretServeHttp,
  journaliserRefusDemarrageConfigurationHttp,
} from "@kidopanel/database";
import { serve } from "@hono/node-server";
import { creerApplicationServeurJeux } from "./http/create-application-serveur-jeux.js";
import {
  obtenirAdresseEcouteServeurJeux,
  obtenirPortEcouteServeurJeux,
} from "./config/environnement-serveur-instance.js";

const port = obtenirPortEcouteServeurJeux();
const adresseEcoute = obtenirAdresseEcouteServeurJeux();

let application;
try {
  application = creerApplicationServeurJeux();
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
    creerJournalPretServeHttp({ cleMessage: "serveur_jeux_http_pret" }),
  );
}
