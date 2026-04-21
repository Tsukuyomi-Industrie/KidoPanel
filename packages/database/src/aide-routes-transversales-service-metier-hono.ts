import type { Context, ErrorHandler, MiddlewareHandler } from "hono";
import type { PrismaClient } from "@prisma/client";
import { sonderPostgreSqlPourRouteSante } from "./sonder-postgresql-route-sante.js";

/**
 * Bloque le démarrage HTTP lorsque la persistance PostgreSQL n’est pas configurée.
 */
export function exigerDatabaseUrlPourDemarrageService(params: {
  messageErreurSiAbsent: string;
}): void {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(params.messageErreurSiAbsent);
  }
}

/** Handler GET `/health` commun aux services métier exposant Prisma. */
export function creerHandlerSantePostgreSql(
  client: PrismaClient,
): MiddlewareHandler {
  return async (c) => {
    const joignable = await sonderPostgreSqlPourRouteSante(client);
    return c.json(
      { status: joignable ? "ok" : "error" },
      joignable ? 200 : 503,
    );
  };
}

/** Réponse JSON standard lorsqu’aucune route ne correspond au chemin demandé. */
export function creerReponseRouteIntrouvableServiceMetier(params: {
  messageDetail: string;
}): (c: Context) => Response {
  return (c) =>
    c.json(
      {
        error: {
          code: "ROUTE_NOT_FOUND",
          message: params.messageDetail,
        },
      },
      404,
    );
}

/** Journalise l’erreur avec la clé service et renvoie une erreur HTTP 500 générique au client. */
export function creerGestionnaireErreurInterneServiceMetier(params: {
  cleServiceJournal: string;
  messageReponseClient: string;
}): ErrorHandler {
  return (erreur, c) => {
    console.error(
      JSON.stringify({
        service: params.cleServiceJournal,
        message: erreur instanceof Error ? erreur.message : "erreur_inconnue",
        stack: erreur instanceof Error ? erreur.stack : undefined,
        requestId: c.get("requestId"),
      }),
    );
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: params.messageReponseClient,
        },
      },
      500,
    );
  };
}
