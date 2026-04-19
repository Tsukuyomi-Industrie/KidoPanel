import "./charger-env-racine-monorepo.js";
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
          message: "serveur_jeux_http_pret",
          port: info.port,
          adresse: info.address,
        }),
      );
    },
  );
}
