import type { Context, Next } from "hono";

/**
 * Middleware qui trace méthode, chemin, code de réponse et durée pour le diagnostic réseau.
 */
export async function requestLogMiddleware(
  c: Context,
  next: Next,
): Promise<void> {
  const debut = performance.now();
  await next();
  const dureeMs = Math.round(performance.now() - debut);
  const statut = c.res.status;
  console.log(
    `[gateway] ${c.req.method} ${c.req.path} → ${String(statut)} (${String(dureeMs)} ms)`,
  );
}
