import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { Context } from "hono";
import type { CycleVieInstanceServeur } from "../services/cycle-vie-instance-serveur.service.js";
import type { ClientMoteurConteneursHttp } from "../services/client-moteur-conteneurs-http.service.js";
import type { VariablesServeurJeux } from "../http/types/variables-http-serveur-jeux.js";
import {
  corpsCreationInstanceServeurJeuxSchema,
} from "../http/schemas/instance-serveur-corps.schema.js";
import {
  creerMiddlewareIdentiteInterneObligatoire,
} from "../http/middleware/identite-interne.middleware.js";
import { ErreurMetierInstanceJeux } from "../erreurs/erreurs-metier-instance-jeu.js";

/** Routes HTTP cycle de vie : liste, création et pilotage des instances jeu. */
export function monterRoutesCycleInstanceServeurJeux(
  cycleVie: CycleVieInstanceServeur,
  clientMoteur: ClientMoteurConteneursHttp,
): Hono<{ Variables: VariablesServeurJeux }> {
  const routes = new Hono<{ Variables: VariablesServeurJeux }>();

  routes.use("*", creerMiddlewareIdentiteInterneObligatoire());

  routes.get("/:idInstance/logs/stream", async (c) => {
    try {
      const ligne = await cycleVie.obtenirDetailPourIdentiteInterne({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("idInstance"),
      });
      const idDocker = ligne.containerId?.trim();
      if (!idDocker) {
        return c.json(
          {
            error: {
              code: "CONTENEUR_INSTANCE_ABSENT",
              message:
                "Aucun conteneur Docker associé : flux journaux indisponible.",
            },
          },
          404,
        );
      }
      const urlEntrant = new URL(c.req.url, "http://127.0.0.1");
      const amont =
        await clientMoteur.relayerFluxJournauxConteneurVersMoteur({
          idConteneurDocker: idDocker,
          parametresRequete: urlEntrant.searchParams,
          identifiantRequete: c.get("requestId"),
          signalAnnulation: c.req.raw.signal,
        });
      const entetes = new Headers(amont.headers);
      return new Response(amont.body, {
        status: amont.status,
        headers: entetes,
      });
    } catch (erreur) {
      return repondreErreurMetierInstanceJeux(c, erreur);
    }
  });

  routes.get("/", async (c) => {
    try {
      const lignes = await cycleVie.listerPourIdentiteInterne({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
      });
      return c.json({ instances: lignes });
    } catch (erreur) {
      return repondreErreurMetierInstanceJeux(c, erreur);
    }
  });

  routes.post(
    "/",
    zValidator("json", corpsCreationInstanceServeurJeuxSchema),
    async (c) => {
      try {
        const corps = c.req.valid("json");
        const cree = await cycleVie.creerEtOrchestrerInstallation({
          utilisateurIdProprietaire: c.get("utilisateurIdInterne")!,
          role: c.get("roleUtilisateurInterne")!,
          nomBrut: corps.name,
          gameType: corps.gameType,
          memoryMb: corps.memoryMb,
          cpuCores: corps.cpuCores,
          diskGb: corps.diskGb,
          variablesEnvBrutes: corps.env ?? {},
          identifiantRequeteHttp: c.get("requestId"),
          reseauInterneUtilisateurId: corps.reseauInterneUtilisateurId,
          attacherReseauKidopanelComplement: corps.attacherReseauKidopanelComplement,
          reseauPrimaireKidopanel: corps.reseauPrimaireKidopanel,
        });
        return c.json(cree, 201);
      } catch (erreur) {
        return repondreErreurMetierInstanceJeux(c, erreur);
      }
    },
  );

  routes.get("/:idInstance", async (c) => {
    try {
      const detail = await cycleVie.obtenirDetailPourIdentiteInterne({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("idInstance"),
      });
      return c.json(detail);
    } catch (erreur) {
      return repondreErreurMetierInstanceJeux(c, erreur);
    }
  });

  routes.post("/:idInstance/start", async (c) => {
    try {
      const ligne = await cycleVie.demarrer({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("idInstance"),
        identifiantRequeteHttp: c.get("requestId"),
      });
      return c.json(ligne);
    } catch (erreur) {
      return repondreErreurMetierInstanceJeux(c, erreur);
    }
  });

  routes.post("/:idInstance/stop", async (c) => {
    try {
      const ligne = await cycleVie.arreter({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("idInstance"),
        identifiantRequeteHttp: c.get("requestId"),
      });
      return c.json(ligne);
    } catch (erreur) {
      return repondreErreurMetierInstanceJeux(c, erreur);
    }
  });

  routes.post("/:idInstance/restart", async (c) => {
    try {
      const ligne = await cycleVie.redemarrer({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("idInstance"),
        identifiantRequeteHttp: c.get("requestId"),
      });
      return c.json(ligne);
    } catch (erreur) {
      return repondreErreurMetierInstanceJeux(c, erreur);
    }
  });

  routes.delete("/:idInstance", async (c) => {
    try {
      await cycleVie.supprimer({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("idInstance"),
        identifiantRequeteHttp: c.get("requestId"),
      });
      return c.body(null, 204);
    } catch (erreur) {
      return repondreErreurMetierInstanceJeux(c, erreur);
    }
  });

  return routes;
}

function repondreErreurMetierInstanceJeux(
  c: Pick<Context, "json">,
  erreur: unknown,
) {
  if (erreur instanceof ErreurMetierInstanceJeux) {
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
  console.error(
    JSON.stringify({
      service: "server-service",
      contexte: "erreur_route_instance_jeu_non_metier",
      message: erreur instanceof Error ? erreur.message : String(erreur),
      stack: erreur instanceof Error ? erreur.stack : undefined,
    }),
  );
  return c.json(
    {
      error: {
        code: "ERREUR_TECHNIQUE_INSTANCE_JEU",
        message:
          "Une erreur technique inattendue s’est produite lors du traitement de la demande.",
      },
    },
    500,
  );
}
