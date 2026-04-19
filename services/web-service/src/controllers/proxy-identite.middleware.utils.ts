import type { Context } from "hono";
import type { VariablesHttpWeb } from "../http/types/variables-http-web.js";
import { ErreurMetierWebInstance } from "../erreurs/erreurs-metier-web-instance.js";

/**
 * Identifiant interne Prisma après le middleware JWT : levée défensive si invariant violé (ne devrait pas arriver).
 */
export function obtenirUtilisateurIdInternePourProxy(
  c: Context<{ Variables: VariablesHttpWeb }>,
): string {
  const identifiant = c.get("utilisateurIdInterne");
  if (typeof identifiant !== "string" || identifiant.trim().length === 0) {
    throw new ErreurMetierWebInstance(
      "INSTANCE_WEB_ACCES_REFUSE",
      "Identité interne absente pour la route proxy.",
      401,
    );
  }
  return identifiant;
}

/**
 * Rôle métier normalisé après le même middleware ; utilisé pour bloquer les mutations en lecture seule.
 */
export function obtenirRoleInternePourProxy(
  c: Context<{ Variables: VariablesHttpWeb }>,
): "ADMIN" | "USER" | "VIEWER" {
  const role = c.get("roleUtilisateurInterne");
  if (role === "ADMIN" || role === "USER" || role === "VIEWER") {
    return role;
  }
  throw new ErreurMetierWebInstance(
    "INSTANCE_WEB_ACCES_REFUSE",
    "Rôle interne absent pour la route proxy.",
    401,
  );
}
