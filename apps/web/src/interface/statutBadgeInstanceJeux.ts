import type { StatutInstanceBadge } from "./BadgeStatut.js";

/** Projette le statut Prisma/API vers la variante visuelle du badge du panel. */
export function statutBadgeDepuisChaineApi(v: string): StatutInstanceBadge {
  switch (v.trim().toUpperCase()) {
    case "RUNNING":
      return "running";
    case "STOPPED":
      return "stopped";
    case "STARTING":
      return "starting";
    case "STOPPING":
      return "stopping";
    case "CRASHED":
      return "crashed";
    case "ERROR":
      return "error";
    case "INSTALLING":
      return "installing";
    default:
      return "error";
  }
}
