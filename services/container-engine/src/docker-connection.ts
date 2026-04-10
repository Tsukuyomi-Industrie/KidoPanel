import Docker from "dockerode";

export type DockerClient = Docker;

/** Options transmises à `dockerode` (socket, hôte, TLS, etc.). */
export type DockerConnectionOptions = ConstructorParameters<typeof Docker>[0];

/**
 * Instancie un client API Docker. Sans argument, utilise l’environnement
 * (`DOCKER_HOST`, chemins des certificats, etc.) comme le CLI Docker.
 */
export function createDockerClient(
  options?: DockerConnectionOptions,
): DockerClient {
  return options !== undefined ? new Docker(options) : new Docker();
}
