import type { Context, MiddlewareHandler, Next } from "hono";
import {
  lireIdentiteInterneDepuisEnTetes,
  type RoleUtilisateurInterne,
} from "./identite-interne-http.js";

/**
 * Fabrique un middleware Hono qui impose les en-têtes `x-kidopanel-*` injectés par la passerelle
 * après authentification du jeton utilisateur côté API publique.
 */
export function creerMiddlewareIdentiteInterneObligatoire<
  TVariables extends {
    utilisateurIdInterne?: string;
    roleUtilisateurInterne?: RoleUtilisateurInterne;
  },
>(): MiddlewareHandler<{ Variables: TVariables }> {
  return async (c: Context<{ Variables: TVariables }>, next: Next) => {
    const identite = lireIdentiteInterneDepuisEnTetes((nom: string) =>
      c.req.header(nom),
    );
    if (!identite.utilisateurId) {
      return c.json(
        {
          error: {
            code: "IDENTITE_INTERNE_MANQUANTE",
            message:
              "En-tête interne utilisateur absent : ce service doit être appelé via la passerelle.",
          },
        },
        401,
      );
    }
    c.set("utilisateurIdInterne", identite.utilisateurId);
    c.set("roleUtilisateurInterne", identite.role);
    await next();
  };
}
