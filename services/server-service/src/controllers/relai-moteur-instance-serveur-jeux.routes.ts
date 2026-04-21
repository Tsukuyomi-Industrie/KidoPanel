import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import type { Hono } from "hono";
import {
  construireReponseRelayDepuisFetchMoteur,
  execConteneurCorpsSchema,
} from "@kidopanel/database";
import type { CycleVieInstanceServeur } from "../services/cycle-vie-instance-serveur.service.js";
import type { ClientMoteurConteneursHttp } from "../services/client-moteur-conteneurs-http.service.js";
import type { VariablesServeurJeux } from "../http/types/variables-http-serveur-jeux.js";

type RepondreErreurInstanceJeux = (
  c: Pick<Context, "json">,
  erreur: unknown,
) => Response | Promise<Response>;

/** Routes relais container-engine (`exec`, fichiers) résolues par identifiant d’instance jeu. */
export function monterRelaisMoteurExecEtFsInstanceServeurJeux(params: {
  routes: Hono<{ Variables: VariablesServeurJeux }>;
  cycleVie: CycleVieInstanceServeur;
  clientMoteur: ClientMoteurConteneursHttp;
  repondreErreurMetierInstanceJeux: RepondreErreurInstanceJeux;
}): void {
  const {
    routes,
    cycleVie,
    clientMoteur,
    repondreErreurMetierInstanceJeux: repondreErreur,
  } = params;

  routes.post(
    "/:idInstance/exec",
    zValidator("json", execConteneurCorpsSchema),
    async (c) => {
      try {
        const ligne = await cycleVie.obtenirDetailPourIdentiteInterne({
          utilisateurId: c.get("utilisateurIdInterne")!,
          role: c.get("roleUtilisateurInterne")!,
          instanceId: c.req.param("idInstance")!,
        });
        const idDocker = ligne.containerId?.trim();
        if (!idDocker) {
          return c.json(
            {
              error: {
                code: "CONTENEUR_INSTANCE_ABSENT",
                message:
                  "Aucun conteneur Docker associé : exécution de commande impossible.",
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
        return repondreErreur(c, error_);
      }
    },
  );

  routes.get("/:idInstance/fs/list", async (c) => {
    try {
      const ligne = await cycleVie.obtenirDetailPourIdentiteInterne({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("idInstance")!,
      });
      const idDocker = ligne.containerId?.trim();
      if (!idDocker) {
        return c.json(
          {
            error: {
              code: "CONTENEUR_INSTANCE_ABSENT",
              message:
                "Aucun conteneur Docker associé : fichiers indisponibles.",
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
      return repondreErreur(c, error_);
    }
  });

  routes.get("/:idInstance/fs/content", async (c) => {
    try {
      const ligne = await cycleVie.obtenirDetailPourIdentiteInterne({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("idInstance")!,
      });
      const idDocker = ligne.containerId?.trim();
      if (!idDocker) {
        return c.json(
          {
            error: {
              code: "CONTENEUR_INSTANCE_ABSENT",
              message:
                "Aucun conteneur Docker associé : fichiers indisponibles.",
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
      return repondreErreur(c, error_);
    }
  });

  routes.put("/:idInstance/fs/content", async (c) => {
    try {
      const ligne = await cycleVie.obtenirDetailPourIdentiteInterne({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("idInstance")!,
      });
      const idDocker = ligne.containerId?.trim();
      if (!idDocker) {
        return c.json(
          {
            error: {
              code: "CONTENEUR_INSTANCE_ABSENT",
              message:
                "Aucun conteneur Docker associé : fichiers indisponibles.",
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
      return repondreErreur(c, error_);
    }
  });

  routes.delete("/:idInstance/fs", async (c) => {
    try {
      const ligne = await cycleVie.obtenirDetailPourIdentiteInterne({
        utilisateurId: c.get("utilisateurIdInterne")!,
        role: c.get("roleUtilisateurInterne")!,
        instanceId: c.req.param("idInstance")!,
      });
      const idDocker = ligne.containerId?.trim();
      if (!idDocker) {
        return c.json(
          {
            error: {
              code: "CONTENEUR_INSTANCE_ABSENT",
              message:
                "Aucun conteneur Docker associé : fichiers indisponibles.",
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
      return repondreErreur(c, error_);
    }
  });
}
