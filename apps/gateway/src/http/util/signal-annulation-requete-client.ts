import type { Context } from "hono";
import type { IncomingMessage } from "node:http";

/**
 * Propage la fermeture ou l’abandon de la requête entrante vers `fetch` amont (libération des flux SSE).
 */
export function obtenirSignalAnnulationPourFetchAmont(
  c: Context,
): AbortSignal | undefined {
  if (typeof AbortController === "undefined") {
    return undefined;
  }
  const brut: unknown = c.req.raw;
  if (
    brut &&
    typeof brut === "object" &&
    "signal" in brut &&
    brut.signal instanceof AbortSignal
  ) {
    return brut.signal;
  }
  const ac = new AbortController();
  if (brut === null || typeof brut !== "object" || !("on" in brut)) {
    return ac.signal;
  }
  const entrant = brut as IncomingMessage;
  const annuler = (): void => {
    ac.abort();
  };
  entrant.on?.("close", annuler);
  entrant.on?.("aborted", annuler);
  return ac.signal;
}
