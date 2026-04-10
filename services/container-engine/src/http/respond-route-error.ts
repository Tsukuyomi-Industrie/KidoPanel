import type { Context } from "hono";
import { isContainerEngineError } from "../errors.js";
import { statusAndBodyForEngineError } from "./map-engine-error-to-http.js";

/**
 * Si l’erreur est une `ContainerEngineError`, renvoie la réponse HTTP adaptée ;
 * sinon retourne `null` pour laisser le gestionnaire global traiter l’exception.
 */
export function tryRespondWithEngineError(
  c: Context,
  err: unknown,
): Response | null {
  if (!isContainerEngineError(err)) {
    return null;
  }
  const { status, body } = statusAndBodyForEngineError(err);
  return c.json(body, status);
}
