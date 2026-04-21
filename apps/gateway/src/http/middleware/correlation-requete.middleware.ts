import type { Context, Next } from "hono";
import { executerCorrelationRequeteAvecMesure } from "@kidopanel/database";
import {
  incrementerErreursPasserelle,
  incrementerRequetesPasserelle,
  lireMetriquesPasserelle,
} from "../../observabilite/metriques-passerelle.js";
import { journaliserPasserelle } from "../../observabilite/journal-json.js";
import type { VariablesGateway } from "../types/gateway-variables.js";
import { EN_TETE_ID_REQUETE_INTERNE } from "../constantes-correlation-http.js";

/**
 * Attribue un requestId unique par requête (côté passerelle uniquement), répercute l’en-tête de réponse,
 * journalise la fin de traitement et met à jour les compteurs de requêtes et d’erreurs serveur (statut ≥ 500).
 */
export async function middlewareCorrelationRequete(
  c: Context<{ Variables: VariablesGateway }>,
  next: Next,
): Promise<void> {
  await executerCorrelationRequeteAvecMesure(c, next, ({ requestId, dureeMs, statut }) => {
    incrementerRequetesPasserelle();
    if (statut >= 500) {
      incrementerErreursPasserelle();
    }

    c.header(EN_TETE_ID_REQUETE_INTERNE, requestId);

    journaliserPasserelle({
      niveau: "info",
      message: "requete_http_terminee",
      requestId,
      metadata: {
        methode: c.req.method,
        chemin: c.req.path,
        statut,
        dureeMs,
      },
    });
  });
}

/** Réponse JSON des compteurs internes pour diagnostic opérationnel. */
export function routeMetriquesPasserelle(c: Context): Response {
  return c.json(lireMetriquesPasserelle());
}
