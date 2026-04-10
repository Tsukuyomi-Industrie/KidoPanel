/** Exports publics du package : moteur, erreurs, client Docker et types métier. */
export {
  ContainerEngine,
  type ContainerEngineOptions,
} from "./container-engine.js";
export {
  ContainerEngineError,
  isContainerEngineError,
  type ContainerEngineErrorCode,
} from "./errors.js";
export {
  createDockerClient,
  type DockerClient,
  type DockerConnectionOptions,
} from "./docker-connection.js";
export type {
  ContainerCreateSpec,
  ContainerHostConfig,
  ContainerStatus,
  ContainerSummary,
  CreateContainerResult,
  PortBinding,
} from "./types.js";
