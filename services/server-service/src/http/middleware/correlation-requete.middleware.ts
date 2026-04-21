import type { Context, Next } from "hono";
import { executerCorrelationRequeteAvecMesure } from "@kidopanel/database";
import type { VariablesServeurJeux } from "../types/variables-http-serveur-jeux.js";
import {
  incrementerErreursServeurJeux,
  incrementerRequetesServeurJeux,
} from "../../observabilite/metriques-serveur-jeux.js";

/** Attribue un identifiant de corrélation par requête pour les journaux et l’appel au moteur Docker. */
export async function middlewareCorrelationServeurJeux(
  c: Context<{ Variables: VariablesServeurJeux }>,
  next: Next,
): Promise<void> {
  await executerCorrelationRequeteAvecMesure(c, next, ({ requestId, dureeMs, statut }) => {
    incrementerRequetesServeurJeux();
    if (statut >= 500) {
      incrementerErreursServeurJeux();
    }
    c.header("X-Request-Id", requestId);
    if (process.env.NODE_ENV !== "production") {
      c.header("X-Kidopanel-Temps-Ms", String(dureeMs));
    }
  });
}
