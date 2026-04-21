import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import type { Hono } from "hono";
import {
  construireReponseRelayDepuisFetchMoteur,
  execConteneurCorpsSchema,
} from "@kidopanel/database";
import type { CycleVieWebInstance } from "../services/cycle-vie-web-instance.service.js";
import type { ClientMoteurWebHttp } from "../services/client-moteur-web.service.js";
import type { VariablesHttpWeb } from "../http/types/variables-http-web.js";

type RepondreErreurWeb = (
  c: Pick<Context, "json">,
  erreur: unknown,
) => Response | Promise<Response>;

/** Routes relais container-engine (`exec`, fichiers) résolues par identifiant d’instance web. */
export function monterRelaisMoteurExecEtFsWebInstance(params: {
  routes: Hono<{ Variables: VariablesHttpWeb }>;
  cycleVie: CycleVieWebInstance;
  clientMoteur: ClientMoteurWebHttp;
  repondreErreurWebInstance: RepondreErreurWeb;
}): void {
  const { routes, cycleVie, clientMoteur, repondreErreurWebInstance } = params;

  routes.post(
    "/:id/exec",
    zValidator("json", execConteneurCorpsSchema),
    async (c) => {
      try {
        const ligne = await cycleVie.obtenirDetailPourIdentiteInterne({
          utilisateurId: c.get("utilisateurIdInterne")!,
          role: c.get("roleUtilisateurInterne")!,
          instanceId: c.req.param("id")!,
        });
        const idDocker = ligne.containerId?.trim();
        if (!idDocker) {
          return c.json(
            {
              error: {
                code: "CONTENEUR_INSTANCE_ABSENT",
                message:
                  "Aucun conteneur associé : exécution de commande impossible.",
              },
            },
            404,
          );
        }
        const corps = c.req.valid("json");
        const amont = await clientMoteur.posterExecDansConteneur(
          idDocker,
          corps,
          c.get("requestId"),
        );
        return construireReponseRelayDepuisFetchMoteur(amont);
      } catch (error_) {
        return repondreErreurWebInstance(c, error_);
      }
    },
  );

  routes.get("/:id/fs/list", async (c) => {
    try {
      const ligne = await cycleVie.obtenirDetailPourIdentiteInterne({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("id")!,
      });
      const idDocker = ligne.containerId?.trim();
      if (!idDocker) {
        return c.json(
          {
            error: {
              code: "CONTENEUR_INSTANCE_ABSENT",
              message: "Aucun conteneur associé : fichiers indisponibles.",
            },
          },
          404,
        );
      }
      const urlEntrant = new URL(c.req.url, "http://127.0.0.1");
      const chemin = urlEntrant.searchParams.get("path")?.trim() ?? "";
      const amont = await clientMoteur.obtenirListeFsConteneur({
        idConteneurDocker: idDocker,
        cheminAbsolu: chemin,
        identifiantRequete: c.get("requestId"),
      });
      return construireReponseRelayDepuisFetchMoteur(amont);
    } catch (error_) {
      return repondreErreurWebInstance(c, error_);
    }
  });

  routes.get("/:id/fs/content", async (c) => {
    try {
      const ligne = await cycleVie.obtenirDetailPourIdentiteInterne({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("id")!,
      });
      const idDocker = ligne.containerId?.trim();
      if (!idDocker) {
        return c.json(
          {
            error: {
              code: "CONTENEUR_INSTANCE_ABSENT",
              message: "Aucun conteneur associé : fichiers indisponibles.",
            },
          },
          404,
        );
      }
      const urlEntrant = new URL(c.req.url, "http://127.0.0.1");
      const chemin = urlEntrant.searchParams.get("path")?.trim() ?? "";
      const amont = await clientMoteur.obtenirContenuFichierFsConteneur({
        idConteneurDocker: idDocker,
        cheminAbsolu: chemin,
        identifiantRequete: c.get("requestId"),
      });
      return construireReponseRelayDepuisFetchMoteur(amont);
    } catch (error_) {
      return repondreErreurWebInstance(c, error_);
    }
  });

  routes.put("/:id/fs/content", async (c) => {
    try {
      const ligne = await cycleVie.obtenirDetailPourIdentiteInterne({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("id")!,
      });
      const idDocker = ligne.containerId?.trim();
      if (!idDocker) {
        return c.json(
          {
            error: {
              code: "CONTENEUR_INSTANCE_ABSENT",
              message: "Aucun conteneur associé : fichiers indisponibles.",
            },
          },
          404,
        );
      }
      const urlEntrant = new URL(c.req.url, "http://127.0.0.1");
      const chemin = urlEntrant.searchParams.get("path")?.trim() ?? "";
      const corps = await c.req.text();
      const amont = await clientMoteur.ecrireFichierFsConteneur({
        idConteneurDocker: idDocker,
        cheminAbsolu: chemin,
        contenuUtf8: corps,
        identifiantRequete: c.get("requestId"),
      });
      return construireReponseRelayDepuisFetchMoteur(amont);
    } catch (error_) {
      return repondreErreurWebInstance(c, error_);
    }
  });

  routes.delete("/:id/fs", async (c) => {
    try {
      const ligne = await cycleVie.obtenirDetailPourIdentiteInterne({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("id")!,
      });
      const idDocker = ligne.containerId?.trim();
      if (!idDocker) {
        return c.json(
          {
            error: {
              code: "CONTENEUR_INSTANCE_ABSENT",
              message: "Aucun conteneur associé : fichiers indisponibles.",
            },
          },
          404,
        );
      }
      const urlEntrant = new URL(c.req.url, "http://127.0.0.1");
      const chemin = urlEntrant.searchParams.get("path")?.trim() ?? "";
      const amont = await clientMoteur.supprimerCheminFsConteneur({
        idConteneurDocker: idDocker,
        cheminAbsolu: chemin,
        identifiantRequete: c.get("requestId"),
      });
      return construireReponseRelayDepuisFetchMoteur(amont);
    } catch (error_) {
      return repondreErreurWebInstance(c, error_);
    }
  });
}
