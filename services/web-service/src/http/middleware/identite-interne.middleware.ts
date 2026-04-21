import type { MiddlewareHandler } from "hono";
import { creerMiddlewareIdentiteInterneObligatoire as fabriquerIdentiteInterne } from "@kidopanel/database";
import type { VariablesHttpWeb } from "../types/variables-http-web.js";

/** Exige les en-têtes internes posés par la passerelle après vérification du jeton. */
export function creerMiddlewareIdentiteInterneObligatoire(): MiddlewareHandler<{
  Variables: VariablesHttpWeb;
}> {
  return fabriquerIdentiteInterne<VariablesHttpWeb>();
}
