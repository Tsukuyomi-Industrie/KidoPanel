import { randomUUID } from "node:crypto";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { ReseauInterneUtilisateurRepository } from "../../auth/reseau-interne-utilisateur-repository.prisma.js";
import { creerMiddlewareAuthObligatoire } from "../../auth/auth.middleware.js";
import { getContainerEngineBaseUrl } from "../../config/gateway-env.js";
import { journaliserPasserelle } from "../../observabilite/journal-json.js";
import { EN_TETE_ID_REQUETE_INTERNE } from "../constantes-correlation-http.js";
import { forwardRequestToContainerEngine } from "../proxy/container-engine-proxy.js";
import type { VariablesGateway } from "../types/gateway-variables.js";

const corpsCreationReseauInternePasserelleSchema = z.object({
  nomAffichage: z.string().min(1).max(128),
  sousReseauCidr: z.string().min(9).max(64),
  passerelleIpv4: z.string().max(45).optional(),
  sansRouteVersInternetExterne: z.boolean().optional(),
  pontBridgeDocker: z.string().max(15).optional(),
});

async function supprimerPontSurMoteurHttp(
  nomDocker: string,
  identifiantCorrelation: string,
): Promise<void> {
  const base = getContainerEngineBaseUrl().replace(/\/+$/, "");
  const url = `${base}/reseaux-internes?nomDocker=${encodeURIComponent(nomDocker)}`;
  try {
    await fetch(url, {
      method: "DELETE",
      headers: { [EN_TETE_ID_REQUETE_INTERNE]: identifiantCorrelation },
    });
  } catch {
    /* compensation best-effort */
  }
}

/**
 * API panel : ponts réseau isolés par compte ; la passerelle persiste les métadonnées après succès Docker.
 */
export function monterRoutesReseauxInternesPasserelle(
  app: Hono<{ Variables: VariablesGateway }>,
  secretJwt: Uint8Array,
  depotReseaux: ReseauInterneUtilisateurRepository,
): void {
  const routes = new Hono<{ Variables: VariablesGateway }>();
  routes.use("*", creerMiddlewareAuthObligatoire(secretJwt));

  routes.get("/", async (c) => {
    const utilisateur = c.get("utilisateur");
    if (utilisateur === undefined) {
      throw new Error("Invariant : utilisateur absent après authentification.");
    }
    const liste = await depotReseaux.listerPourUtilisateur(utilisateur.id);
    return c.json({ reseauxInternes: liste });
  });

  routes.post(
    "/",
    zValidator("json", corpsCreationReseauInternePasserelleSchema),
    async (c) => {
      const utilisateur = c.get("utilisateur");
      if (utilisateur === undefined) {
        throw new Error("Invariant : utilisateur absent après authentification.");
      }
      const corps = c.req.valid("json");
      const idReseau = randomUUID();
      const nomDocker = `kidopanel-unet-${idReseau}`;
      const corpsMoteur = JSON.stringify({
        nomDocker,
        sousReseauCidr: corps.sousReseauCidr.trim(),
        passerelleIpv4: corps.passerelleIpv4,
        sansRouteVersInternetExterne: corps.sansRouteVersInternetExterne ?? false,
        pontBridgeDocker: corps.pontBridgeDocker,
      });
      const amont = await forwardRequestToContainerEngine(c, {
        corpsRemplacement: new TextEncoder().encode(corpsMoteur),
        cheminRelaisForceSurMoteur: "/reseaux-internes",
      });
      if (!amont.ok) {
        return amont;
      }
      let sousReseauEffectif = corps.sousReseauCidr.trim();
      let passerelleEffectif = "";
      try {
        const parse = JSON.parse(await amont.text()) as {
          sousReseauCidr?: string;
          passerelleIpv4?: string;
        };
        if (typeof parse.sousReseauCidr === "string") {
          sousReseauEffectif = parse.sousReseauCidr;
        }
        if (typeof parse.passerelleIpv4 === "string") {
          passerelleEffectif = parse.passerelleIpv4;
        }
      } catch {
        journaliserPasserelle({
          niveau: "warn",
          message: "reseau_interne_reponse_moteur_json_inattendue",
          requestId: c.get("requestId"),
          metadata: { nomDocker },
        });
        await supprimerPontSurMoteurHttp(nomDocker, c.get("requestId"));
        return c.json(
          {
            error: {
              code: "RESEAU_INTERNE_REPONSE_INVALIDE",
              message:
                "Réponse du moteur illisible après création du réseau ; la tentative a été annulée.",
            },
          },
          502,
        );
      }
      if (passerelleEffectif.length === 0) {
        await supprimerPontSurMoteurHttp(nomDocker, c.get("requestId"));
        return c.json(
          {
            error: {
              code: "RESEAU_INTERNE_REPONSE_INVALIDE",
              message:
                "Passerelle absente dans la réponse moteur ; création annulée.",
            },
          },
          502,
        );
      }
      try {
        const ligne = await depotReseaux.enregistrerApresCreationDocker({
          id: idReseau,
          userId: utilisateur.id,
          nomAffichage: corps.nomAffichage.trim(),
          nomDocker,
          sousReseauCidr: sousReseauEffectif,
          passerelleIpv4: passerelleEffectif,
          sansRouteVersInternetExterne: corps.sansRouteVersInternetExterne ?? false,
        });
        return c.json({ reseauInterne: ligne }, 201);
      } catch (erreur) {
        journaliserPasserelle({
          niveau: "error",
          message: "reseau_interne_echec_persistance_apres_docker",
          requestId: c.get("requestId"),
          metadata: { nomDocker, code: String(erreur) },
        });
        await supprimerPontSurMoteurHttp(nomDocker, c.get("requestId"));
        throw erreur;
      }
    },
  );

  routes.delete("/:idReseau", async (c) => {
    const utilisateur = c.get("utilisateur");
    if (utilisateur === undefined) {
      throw new Error("Invariant : utilisateur absent après authentification.");
    }
    const ligne = await depotReseaux.trouverPourUtilisateur(
      c.req.param("idReseau"),
      utilisateur.id,
    );
    if (ligne === null) {
      return c.json(
        {
          error: {
            code: "RESEAU_INTERNE_INTROUVABLE",
            message: "Réseau introuvable ou non autorisé pour ce compte.",
          },
        },
        404,
      );
    }
    const liees = await depotReseaux.compterInstancesLiees(ligne.id);
    if (liees > 0) {
      return c.json(
        {
          error: {
            code: "RESEAU_INTERNE_UTILISE",
            message:
              "Impossible de supprimer ce réseau : des instances y sont encore rattachées.",
          },
        },
        409,
      );
    }
    const base = getContainerEngineBaseUrl().replace(/\/+$/, "");
    const urlSuppression = `${base}/reseaux-internes?nomDocker=${encodeURIComponent(ligne.nomDocker)}`;
    let amont: Response;
    try {
      amont = await fetch(urlSuppression, {
        method: "DELETE",
        headers: { [EN_TETE_ID_REQUETE_INTERNE]: c.get("requestId") },
      });
    } catch (erreur) {
      journaliserPasserelle({
        niveau: "error",
        message: "reseau_interne_suppression_moteur_indisponible",
        requestId: c.get("requestId"),
        metadata: { code: String(erreur) },
      });
      return c.json(
        {
          error: {
            code: "UPSTREAM_UNAVAILABLE",
            message: "Le moteur de conteneurs est injoignable pour supprimer le pont.",
          },
        },
        502,
      );
    }
    if (!amont.ok) {
      const corps = await amont.text();
      return new Response(corps, {
        status: amont.status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
    await depotReseaux.supprimer(ligne.id);
    return c.body(null, 204);
  });

  app.route("/reseaux-internes", routes);
}
