import type { MiddlewareHandler } from "hono";
import { creerMiddlewareIdentiteInterneObligatoire as fabriquerIdentiteInterne } from "@kidopanel/database";
import type { VariablesServeurJeux } from "../types/variables-http-serveur-jeux.js";

/** Exige les en-têtes internes posés par la passerelle après vérification du jeton utilisateur. */
export function creerMiddlewareIdentiteInterneObligatoire(): MiddlewareHandler<{
  Variables: VariablesServeurJeux;
}> {
  return fabriquerIdentiteInterne<VariablesServeurJeux>();
}
