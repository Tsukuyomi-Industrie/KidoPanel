import { Hono } from "hono";
import {
  prisma,
  creerGestionnaireErreurInterneServiceMetier,
  creerHandlerSantePostgreSql,
  creerReponseRouteIntrouvableServiceMetier,
  exigerDatabaseUrlPourDemarrageService,
} from "@kidopanel/database";
import { monterRoutesCycleInstanceServeurJeux } from "../controllers/serverLifecycle.controller.js";
import { DepotInstanceServeur } from "../repositories/depot-instance-serveur.repository.js";
import { DepotProprieteConteneurInstance } from "../repositories/depot-propriete-conteneur-instance.repository.js";
import { DepotReseauInterneUtilisateur } from "../repositories/depot-reseau-interne-utilisateur.repository.js";
import { ClientMoteurConteneursHttp } from "../services/client-moteur-conteneurs-http.service.js";
import { CycleVieInstanceServeur } from "../services/cycle-vie-instance-serveur.service.js";
import { obtenirUrlBaseMoteurConteneurs } from "../config/environnement-serveur-instance.js";
import { middlewareCorrelationServeurJeux } from "./middleware/correlation-requete.middleware.js";
import type { VariablesServeurJeux } from "./types/variables-http-serveur-jeux.js";
import { lireMetriquesServeurJeuxBrut } from "../observabilite/metriques-serveur-jeux.js";

/** Assemble l’application HTTP : santé, métriques Prometheus minimales et cycle de vie sous `/instances`. */
export function creerApplicationServeurJeux(): Hono<{
  Variables: VariablesServeurJeux;
}> {
  exigerDatabaseUrlPourDemarrageService({
    messageErreurSiAbsent:
      "Variable DATABASE_URL manquante : obligatoire pour la persistance des instances jeu.",
  });

  const depot = new DepotInstanceServeur(prisma);
  const depotPropriete = new DepotProprieteConteneurInstance(prisma);
  const depotReseauInterne = new DepotReseauInterneUtilisateur(prisma);
  const clientMoteur = new ClientMoteurConteneursHttp(
    obtenirUrlBaseMoteurConteneurs(),
  );
  const cycleVie = new CycleVieInstanceServeur(
    prisma,
    depot,
    depotPropriete,
    clientMoteur,
    depotReseauInterne,
  );

  const app = new Hono<{ Variables: VariablesServeurJeux }>();

  app.use("*", middlewareCorrelationServeurJeux);

  app.get("/", (c) =>
    c.json({
      service: "server-service",
      description:
        "Orchestration des instances de serveurs de jeu (Prisma + container-engine HTTP).",
    }),
  );

  app.get("/health", creerHandlerSantePostgreSql(prisma));

  app.get("/metrics", () => {
    const m = lireMetriquesServeurJeuxBrut();
    const corps = [
      "# HELP kidopanel_server_service_http_requests_total Requêtes HTTP traitées.",
      "# TYPE kidopanel_server_service_http_requests_total counter",
      `kidopanel_server_service_http_requests_total ${String(m.requetesTotal)}`,
      "# HELP kidopanel_server_service_http_errors_total Réponses HTTP 5xx.",
      "# TYPE kidopanel_server_service_http_errors_total counter",
      `kidopanel_server_service_http_errors_total ${String(m.erreurs5xx)}`,
      "",
    ].join("\n");
    return new Response(corps, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  });

  app.route(
    "/instances",
    monterRoutesCycleInstanceServeurJeux(cycleVie, clientMoteur),
  );

  app.notFound(
    creerReponseRouteIntrouvableServiceMetier({
      messageDetail: "Route HTTP introuvable sur le service instances jeu.",
    }),
  );

  app.onError(
    creerGestionnaireErreurInterneServiceMetier({
      cleServiceJournal: "server-service",
      messageReponseClient: "Erreur interne du service instances jeu.",
    }),
  );

  return app;
}
