import type { ContainerEngineError } from "../errors.js";

/** Corps JSON d’erreur renvoyé aux clients HTTP pour une erreur métier du moteur. */
export interface EngineErrorHttpBody {
  error: {
    code: string;
    message: string;
  };
}

/** Associe chaque code d’erreur du moteur à un statut HTTP et au corps de réponse. */
export function statusAndBodyForEngineError(
  err: ContainerEngineError,
): { status: 400 | 404 | 409 | 500 | 503; body: EngineErrorHttpBody } {
  const body: EngineErrorHttpBody = {
    error: {
      code: err.code,
      message: err.message,
    },
  };
  switch (err.code) {
    case "DOCKER_UNAVAILABLE":
      return { status: 503, body };
    case "NOT_FOUND":
      return { status: 404, body };
    case "CONFLICT":
      return { status: 409, body };
    case "INVALID_SPEC":
      return { status: 400, body };
    case "OPERATION_FAILED":
    default:
      return { status: 500, body };
  }
}
