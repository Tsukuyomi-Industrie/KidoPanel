import type { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { StringDecoder } from "node:string_decoder";
import type { ContainerEngine } from "../../container-engine.js";
import { journaliserMoteur } from "../../observabilite/journal-json.js";
import {
  decrementerFluxSseMoteur,
  incrementerFluxSseMoteur,
} from "../../observabilite/metriques-moteur.js";
import { tryRespondWithEngineError } from "../respond-route-error.js";
import type { VariablesMoteurHttp } from "../variables-moteur-http.js";
import {
  containerIdParamSchema,
  containerLogsQuerySchema,
} from "../schemas/container-api.schemas.js";

type MorceauFlux = Buffer | string | Uint8Array;

function morceauVersBuffer(m: MorceauFlux): Buffer {
  if (Buffer.isBuffer(m)) {
    return m;
  }
  if (typeof m === "string") {
    return Buffer.from(m);
  }
  return Buffer.from(m);
}

/**
 * Route SSE : relaie le flux Docker `follow` en événements `data` JSON par ligne (`{ "line": "..." }`).
 */
export function mountContainerLogStreamRoute(
  app: Hono<{ Variables: VariablesMoteurHttp }>,
  engine: ContainerEngine,
): void {
  app.get(
    "/containers/:id/logs/stream",
    zValidator("param", containerIdParamSchema),
    zValidator("query", containerLogsQuerySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const query = c.req.valid("query");
      try {
        const flux = await engine.openLogFollowStream(id, {
          tail: query.tail,
          timestamps: query.timestamps,
        });
        return streamSSE(c, async (sse) => {
          incrementerFluxSseMoteur();
          journaliserMoteur({
            niveau: "info",
            message: "flux_journaux_sse_ouvert",
            requestId: c.get("requestId"),
            metadata: { idConteneur: id },
          });
          const requeteEntrante = c.req.raw;
          const fermerSurArretClient = (): void => {
            flux.fermer();
          };
          requeteEntrante.signal.addEventListener("abort", fermerSurArretClient);
          const minuteurPing = setInterval(() => {
            sse.writeSSE({ event: "ping", data: "1" }).catch(() => {});
          }, 25_000);
          try {
            const decodeur = new StringDecoder("utf8");
            let reste = "";
            const iterable = flux.readable as AsyncIterable<MorceauFlux>;
            for await (const morceau of iterable) {
              reste += decodeur.write(morceauVersBuffer(morceau));
              const lignes = reste.split("\n");
              reste = lignes.pop() ?? "";
              for (const ligne of lignes) {
                await sse.writeSSE({
                  data: JSON.stringify({ line: ligne }),
                });
              }
            }
            reste += decodeur.end();
            if (reste.length > 0) {
              await sse.writeSSE({
                data: JSON.stringify({ line: reste }),
              });
            }
          } catch (error_) {
            const meta: Record<string, unknown> = { idConteneur: id };
            if (error_ instanceof Error) {
              if (error_.message.length > 0) {
                meta.erreurMessage = error_.message;
              }
              if (error_.stack !== undefined) {
                meta.stack = error_.stack;
              }
            }
            journaliserMoteur({
              niveau: "error",
              message: "flux_journaux_sse_erreur_lecture",
              requestId: c.get("requestId"),
              metadata: meta,
            });
            const msg =
              error_ instanceof Error ? error_.message : String(error_);
            await sse.writeSSE({
              event: "error",
              data: JSON.stringify({ message: msg }),
            });
          } finally {
            clearInterval(minuteurPing);
            requeteEntrante.signal.removeEventListener(
              "abort",
              fermerSurArretClient,
            );
            flux.fermer();
            decrementerFluxSseMoteur();
            journaliserMoteur({
              niveau: "info",
              message: "flux_journaux_sse_ferme",
              requestId: c.get("requestId"),
              metadata: { idConteneur: id },
            });
          }
        });
      } catch (error_) {
        const response = tryRespondWithEngineError(c, error_);
        if (response) {
          return response;
        }
        throw error_;
      }
    },
  );
}
