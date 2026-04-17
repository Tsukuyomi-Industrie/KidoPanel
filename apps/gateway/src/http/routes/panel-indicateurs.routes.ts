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
      utilisateurId: utilisateur.id,
      identifiantRequete: c.get("requestId"),
    });
    return c.json(donnees);
  });

  app.route("/panel", panel);
}
