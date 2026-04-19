import { Hono } from "hono";
import type { ContainerOwnershipRepository } from "../../auth/container-ownership-repository.prisma.js";
import { creerMiddlewareAuthObligatoire } from "../../auth/auth.middleware.js";
import { prisma } from "@kidopanel/database";
import { collecterIndicateursTableauPanel } from "../services/panel-indicateurs.service.js";
import type { VariablesGateway } from "../types/gateway-variables.js";

/**
 * Routes tableau de bord : agrégats santé et volumétrie conteneurs pour l’utilisateur authentifié.
 */
export function monterRoutesPanelIndicateurs(
  app: Hono<{ Variables: VariablesGateway }>,
  secretJwt: Uint8Array,
  depotPropriete: ContainerOwnershipRepository,
): void {
  const panel = new Hono<{ Variables: VariablesGateway }>();
  panel.use("*", creerMiddlewareAuthObligatoire(secretJwt));

  panel.get("/indicateurs", async (c) => {
    const utilisateur = c.get("utilisateur");
    if (utilisateur === undefined) {
      return c.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Session requise pour les indicateurs du tableau de bord.",
          },
        },
        401,
      );
    }
    const donnees = await collecterIndicateursTableauPanel({
      prisma,
      depotPropriete,
      utilisateur,
      identifiantRequete: c.get("requestId"),
    });
    return c.json(donnees);
  });

  /**
   * IP ou nom d’hôte à afficher pour les chaînes « hôte : port » des serveurs jeu (prioritaire sur le hostname du navigateur).
   * Défini côté serveur pour les accès au panel via localhost ou tunnel SSH alors que les joueurs joignent l’IP publique du VPS.
   */
  panel.get("/adresse-connexion-jeux", async (c) => {
    const utilisateur = c.get("utilisateur");
    if (utilisateur === undefined) {
      return c.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Session requise pour l’adresse de connexion jeu.",
          },
        },
        401,
      );
    }
    const brut = process.env.GATEWAY_PUBLIC_HOST_FOR_CLIENTS?.trim();
    const hotePublicPourJeux =
      brut !== undefined && brut.length > 0 ? brut : null;
    return c.json({ hotePublicPourJeux });
  });

  app.route("/panel", panel);
}
