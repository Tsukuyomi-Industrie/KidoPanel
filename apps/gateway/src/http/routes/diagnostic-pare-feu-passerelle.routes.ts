import { Hono } from "hono";
import { creerMiddlewareAuthObligatoire } from "../../auth/auth.middleware.js";
import { getContainerEngineBaseUrl } from "../../config/gateway-env.js";
import { journaliserErreurPasserelle } from "../../observabilite/journal-json.js";
import { EN_TETE_ID_REQUETE_INTERNE } from "../constantes-correlation-http.js";
import type { VariablesGateway } from "../types/gateway-variables.js";

/**
 * Relai authentifié `GET /panel/pare-feu/diagnostic` vers `GET /diagnostic/pare-feu` du moteur de conteneurs.
 *
 * Sert au panel à expliquer pourquoi un port publié ne s’ouvre pas automatiquement (firewalld inactif,
 * sudo NOPASSWD manquant, etc.) sans que l’utilisateur ait à inspecter les journaux du moteur.
 */
export function monterRoutesDiagnosticPareFeuPasserelle(
  app: Hono<{ Variables: VariablesGateway }>,
  secretJwt: Uint8Array,
): void {
  const sous = new Hono<{ Variables: VariablesGateway }>();
  sous.use("*", creerMiddlewareAuthObligatoire(secretJwt));
  sous.get("/diagnostic", async (c) => {
    const base = getContainerEngineBaseUrl().replace(/\/+$/, "");
    const url = `${base}/diagnostic/pare-feu`;
    try {
      const amont = await fetch(url, {
        method: "GET",
        headers: { [EN_TETE_ID_REQUETE_INTERNE]: c.get("requestId") },
      });
      const corps = await amont.text();
      if (!amont.ok) {
        return new Response(corps, {
          status: amont.status,
          headers: {
            "Content-Type":
              amont.headers.get("Content-Type") ??
              "application/json; charset=utf-8",
          },
        });
      }
      return new Response(corps, {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (error_) {
      journaliserErreurPasserelle(
        "diagnostic_pare_feu_moteur_indisponible",
        error_,
        c.get("requestId"),
      );
      return c.json(
        {
          automatisationActivee: null,
          backendChoisi: null,
          processusEstRoot: false,
          sansSudoForce: false,
          messageDiagnostic:
            "Moteur de conteneurs injoignable depuis la passerelle : impossible de récupérer l’état du pare-feu hôte. Vérifiez que `container-engine` tourne (port 8787 par défaut).",
          details: { moteurUrl: url },
        },
        200,
      );
    }
  });
  app.route("/panel/pare-feu", sous);
}
