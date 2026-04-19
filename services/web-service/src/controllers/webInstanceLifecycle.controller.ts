import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { Context } from "hono";
import type { CycleVieWebInstance } from "../services/cycle-vie-web-instance.service.js";
import type { ClientMoteurWebHttp } from "../services/client-moteur-web.service.js";
import type { VariablesHttpWeb } from "../http/types/variables-http-web.js";
import { corpsCreationWebInstanceSchema } from "../http/schemas/web-instance-corps.schema.js";
import { creerMiddlewareIdentiteInterneObligatoire } from "../http/middleware/identite-interne.middleware.js";
import { ErreurMetierWebInstance } from "../erreurs/erreurs-metier-web-instance.js";
import type { WebStack } from "@kidopanel/database";

/** Routes `/web-instances` : liste, création, pilotage et flux journaux. */
export function monterRoutesCycleWebInstances(
  cycleVie: CycleVieWebInstance,
  clientMoteur: ClientMoteurWebHttp,
): Hono<{ Variables: VariablesHttpWeb }> {
  const routes = new Hono<{ Variables: VariablesHttpWeb }>();

  routes.use("*", creerMiddlewareIdentiteInterneObligatoire());

  routes.get("/:id/logs/stream", async (c) => {
    try {
      const ligne = await cycleVie.obtenirDetailPourIdentiteInterne({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("id"),
      });
      const idDocker = ligne.containerId?.trim();
      if (!idDocker) {
        return c.json(
          {
            error: {
              code: "CONTENEUR_INSTANCE_ABSENT",
              message: "Aucun conteneur associé : journaux indisponibles.",
            },
          },
          404,
        );
      }
      const urlEntrant = new URL(c.req.url, "http://127.0.0.1");
      const amont = await clientMoteur.relayerFluxJournauxConteneurVersMoteur({
        idConteneurDocker: idDocker,
        parametresRequete: urlEntrant.searchParams,
        identifiantRequete: c.get("requestId"),
        signalAnnulation: c.req.raw.signal,
      });
      return new Response(amont.body, {
        status: amont.status,
        headers: new Headers(amont.headers),
      });
    } catch (error_) {
      return repondreErreurWeb(c, error_);
    }
  });

  routes.get("/", async (c) => {
    try {
      const lignes = await cycleVie.listerPourIdentiteInterne({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
      });
      return c.json({ instances: lignes });
    } catch (error_) {
      return repondreErreurWeb(c, error_);
    }
  });

  routes.post(
    "/",
    zValidator("json", corpsCreationWebInstanceSchema),
    async (c) => {
      try {
        const corps = c.req.valid("json");
        const cree = await cycleVie.creerEtOrchestrerInstallation({
          utilisateurIdProprietaire: c.get("utilisateurIdInterne")!,
          role: c.get("roleUtilisateurInterne")!,
          name: corps.name,
          techStack: corps.techStack as WebStack,
          memoryMb: corps.memoryMb,
          diskGb: corps.diskGb,
          env: corps.env ?? {},
          portHote: corps.portHote,
          domaineInitial: corps.domaineInitial,
          gabaritDockerRapideId: corps.gabaritDockerRapideId,
          reseauInterneUtilisateurId: corps.reseauInterneUtilisateurId,
          identifiantRequeteHttp: c.get("requestId"),
        });
        return c.json(cree, 201);
      } catch (error_) {
        return repondreErreurWeb(c, error_);
      }
    },
  );

  routes.get("/:id", async (c) => {
    try {
      const detail = await cycleVie.obtenirDetailPourIdentiteInterne({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("id"),
      });
      return c.json(detail);
    } catch (error_) {
      return repondreErreurWeb(c, error_);
    }
  });

  routes.post("/:id/start", async (c) => {
    try {
      const ligne = await cycleVie.demarrer({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("id"),
        identifiantRequeteHttp: c.get("requestId"),
      });
      return c.json(ligne);
    } catch (error_) {
      return repondreErreurWeb(c, error_);
    }
  });

  routes.post("/:id/stop", async (c) => {
    try {
      const ligne = await cycleVie.arreter({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("id"),
        identifiantRequeteHttp: c.get("requestId"),
      });
      return c.json(ligne);
    } catch (error_) {
      return repondreErreurWeb(c, error_);
    }
  });

  routes.post("/:id/restart", async (c) => {
    try {
      const ligne = await cycleVie.redemarrer({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("id"),
        identifiantRequeteHttp: c.get("requestId"),
      });
      return c.json(ligne);
    } catch (error_) {
      return repondreErreurWeb(c, error_);
    }
  });

  routes.delete("/:id", async (c) => {
    try {
      await cycleVie.supprimer({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("id"),
        identifiantRequeteHttp: c.get("requestId"),
      });
      return c.body(null, 204);
    } catch (error_) {
      return repondreErreurWeb(c, error_);
    }
  });

  return routes;
}

function repondreErreurWeb(c: Pick<Context, "json">, erreur: unknown) {
  if (erreur instanceof ErreurMetierWebInstance) {
    return c.json(
      {
        error: {
          code: erreur.codeMetier,
          message: erreur.message,
          details: erreur.details,
        },
      },
      erreur.statutHttp as never,
    );
  }
  throw erreur;
}
