import { Hono } from "hono";
import type { ContainerOwnershipRepository } from "../../auth/container-ownership-repository.prisma.js";
import { creerMiddlewareAuthObligatoire } from "../../auth/auth.middleware.js";
import type { VariablesGateway } from "../types/gateway-variables.js";
import {
  proxyConteneursAvecPropriete,
  proxyCreationConteneursPost,
  proxyListeConteneursGet,
} from "../services/proxy-conteneurs-authentifie.service.js";

/**
 * Proxy REST des conteneurs vers le container-engine, protégé par JWT et cloisonné par utilisateur.
 */
export function monterRoutesProxyConteneurs(
  app: Hono<{ Variables: VariablesGateway }>,
  secretJwt: Uint8Array,
  depotPropriete: ContainerOwnershipRepository,
): void {
  const conteneurs = new Hono<{ Variables: VariablesGateway }>();
  conteneurs.use("*", creerMiddlewareAuthObligatoire(secretJwt));

  const exigerUtilisateur = (c: Parameters<typeof proxyConteneursAvecPropriete>[0]) => {
    const utilisateur = c.get("utilisateur");
    if (utilisateur === undefined) {
      throw new Error(
        "Invariant : absence d’utilisateur après authentification JWT.",
      );
    }
    return utilisateur;
  };

  conteneurs.get("/", (c) =>
    proxyListeConteneursGet(c, exigerUtilisateur(c), depotPropriete),
  );
  conteneurs.post("/", (c) =>
    proxyCreationConteneursPost(c, exigerUtilisateur(c), depotPropriete),
  );

  const relayer = (c: Parameters<typeof proxyConteneursAvecPropriete>[0]) =>
    proxyConteneursAvecPropriete(c, exigerUtilisateur(c), depotPropriete);
  conteneurs.post("/:id/start", relayer);
  conteneurs.post("/:id/stop", relayer);
  conteneurs.delete("/:id", relayer);
  conteneurs.get("/:id/logs/stream", relayer);
  conteneurs.get("/:id/logs", relayer);

  app.route("/containers", conteneurs);
}
