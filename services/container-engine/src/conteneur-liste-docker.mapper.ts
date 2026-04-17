import type { ContainerInfo } from "dockerode";
import type { ContainerStatus, ContainerSummary } from "./types.js";

/** Normalise l’état brut Docker vers le type `ContainerStatus` du domaine. */
export function mapDockerStateVersStatut(
  state: string | undefined,
): ContainerStatus {
  switch (state) {
    case "created":
    case "running":
    case "paused":
    case "restarting":
    case "removing":
    case "exited":
    case "dead":
      return state;
    default:
      return "unknown";
  }
}

/** Transforme une entrée de `listContainers` Docker en résumé métier. */
export function mapEntreeListeDockerVersResume(c: ContainerInfo): ContainerSummary {
  const ports =
    c.Ports?.map((p) => ({
      privatePort: p.PrivatePort,
      publicPort: p.PublicPort,
      type: p.Type,
      ip: p.IP,
    })) ?? [];

  return {
    id: c.Id,
    names: c.Names ?? [],
    image: c.Image,
    imageId: c.ImageID,
    command: c.Command,
    created: c.Created,
    status: c.Status,
    state: mapDockerStateVersStatut(c.State),
    labels: c.Labels ?? {},
    ports,
  };
}
