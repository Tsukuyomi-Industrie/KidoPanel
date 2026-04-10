/** Codes d’erreur normalisés renvoyés par le moteur de conteneurs. */
export type ContainerEngineErrorCode =
  | "DOCKER_UNAVAILABLE"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_SPEC"
  | "OPERATION_FAILED";

/** Erreur métier avec code stable pour le traitement côté appelant. */
export class ContainerEngineError extends Error {
  readonly code: ContainerEngineErrorCode;
  readonly cause?: unknown;

  constructor(
    code: ContainerEngineErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = "ContainerEngineError";
    this.code = code;
    this.cause = options?.cause;
  }
}

/** Garde de type pour intercepter une `ContainerEngineError`. */
export function isContainerEngineError(
  value: unknown,
): value is ContainerEngineError {
  return value instanceof ContainerEngineError;
}
