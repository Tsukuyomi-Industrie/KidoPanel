import { Hono } from "hono";
import {
  prisma,
  creerGestionnaireErreurInterneServiceMetier,
  creerHandlerSantePostgreSql,
  creerReponseRouteIntrouvableServiceMetier,
  exigerDatabaseUrlPourDemarrageService,
} from "@kidopanel/database";
import { DepotWebInstance } from "../repositories/depot-web-instance.repository.js";
import { DepotDomaineProxy } from "../repositories/depot-domaine-proxy.repository.js";
import { DepotProprieteConteneur } from "../repositories/depot-propriete-conteneur.repository.js";
import { DepotReseauInterneUtilisateur } from "../repositories/depot-reseau-interne-utilisateur.repository.js";
import { ClientMoteurWebHttp } from "../services/client-moteur-web.service.js";
import { CycleVieWebInstance } from "../services/cycle-vie-web-instance.service.js";
import { ProxyManagerService } from "../services/proxy-manager.service.js";
import { obtenirUrlBaseMoteurConteneurs } from "../config/environnement-web-service.js";
import { middlewareCorrelationRequeteWeb } from "./middleware/correlation-requete.middleware.js";
import type { VariablesHttpWeb } from "./types/variables-http-web.js";
import { monterRoutesCycleWebInstances } from "../controllers/webInstanceLifecycle.controller.js";
import { monterRoutesProxyManager } from "../controllers/proxyManager.controller.js";
import { lireMetriquesWebServiceBrut } from "../observabilite/metriques-web-service.js";

/** Assemble l’application HTTP du service instances web et proxy métier. */
export function creerApplicationWeb(): Hono<{ Variables: VariablesHttpWeb }> {
  exigerDatabaseUrlPourDemarrageService({
    messageErreurSiAbsent:
      "Variable DATABASE_URL manquante : obligatoire pour les instances web.",
  });

  const depotWeb = new DepotWebInstance(prisma);
  const depotDomaine = new DepotDomaineProxy(prisma);
  const depotPropriete = new DepotProprieteConteneur(prisma);
  const depotReseau = new DepotReseauInterneUtilisateur(prisma);
  const clientMoteur = new ClientMoteurWebHttp(obtenirUrlBaseMoteurConteneurs());
  const proxyManager = new ProxyManagerService(depotDomaine, clientMoteur);
  const cycleVie = new CycleVieWebInstance(
    prisma,
    depotWeb,
    depotPropriete,
    depotDomaine,
    depotReseau,
    clientMoteur,
    proxyManager,
  );

  const app = new Hono<{ Variables: VariablesHttpWeb }>();

  app.use("*", middlewareCorrelationRequeteWeb);

  app.get("/", (c) =>
    c.json({
      service: "web-service",
      description:
        "Orchestration des instances web applicatives et du proxy Nginx (HTTP vers le moteur uniquement).",
    }),
  );

  app.get("/health", creerHandlerSantePostgreSql(prisma));

  app.get("/metrics", () => {
    const m = lireMetriquesWebServiceBrut();
    const corps = [
      "# HELP kidopanel_web_service_http_requests_total Requêtes traitées.",
      "# TYPE kidopanel_web_service_http_requests_total counter",
      `kidopanel_web_service_http_requests_total ${String(m.requetesTotal)}`,
      "# HELP kidopanel_web_service_http_errors_total Réponses 5xx.",
      "# TYPE kidopanel_web_service_http_errors_total counter",
      `kidopanel_web_service_http_errors_total ${String(m.erreurs5xx)}`,
      "",
    ].join("\n");
    return new Response(corps, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  });

  app.route(
    "/web-instances",
    monterRoutesCycleWebInstances(cycleVie, clientMoteur),
  );
  app.route(
    "/proxy",
    monterRoutesProxyManager({
      depotDomaine,
      depotWeb,
      proxyManager,
      clientMoteur,
    }),
  );

  app.notFound(
    creerReponseRouteIntrouvableServiceMetier({
      messageDetail: "Route HTTP introuvable sur le service web.",
    }),
  );

  app.onError(
    creerGestionnaireErreurInterneServiceMetier({
      cleServiceJournal: "web-service",
      messageReponseClient: "Erreur interne du service web.",
    }),
  );

  return app;
}
