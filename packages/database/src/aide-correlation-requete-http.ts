import { randomUUID } from "node:crypto";
import type { Context, Next } from "hono";

/**
 * Assigne un `requestId`, mesure la durée de traitement puis délègue la fin de corrélation
 * (métriques, en-têtes, journaux) au callback métier.
 */
export async function executerCorrelationRequeteAvecMesure<
  TVariables extends { requestId?: string },
>(
  c: Context<{ Variables: TVariables }>,
  next: Next,
  surFin: (ctx: {
    requestId: string;
    dureeMs: number;
    statut: number;
    c: Context<{ Variables: TVariables }>;
  }) => void | Promise<void>,
): Promise<void> {
  const requestId = randomUUID();
  c.set("requestId", requestId);
  const debut = performance.now();
  await next();
  const dureeMs = Math.round(performance.now() - debut);
  const statut = c.res.status;
  await surFin({ requestId, dureeMs, statut, c });
}
