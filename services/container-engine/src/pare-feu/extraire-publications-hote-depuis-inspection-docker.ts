import type { ContainerInspectInfo } from "dockerode";
import type { PublicationHotePareFeu } from "./types-publication-hote-pare-feu.js";

function extraireProtocoleDepuisClePort(clePort: string): "tcp" | "udp" | undefined {
  const correspondance = /^(\d+)\/(tcp|udp)$/i.exec(clePort);
  if (!correspondance) {
    return undefined;
  }
  return correspondance[2].toLowerCase() as "tcp" | "udp";
}

function liaisonViseSeulementLoopback(ipHost: unknown): boolean {
  const ip = typeof ipHost === "string" ? ipHost.trim() : "";
  if (ip.length === 0) {
    return false;
  }
  return ip === "127.0.0.1" || ip === "::1";
}

function extraireNumeroPortHote(hostPort: unknown): number | undefined {
  const hote = typeof hostPort === "string" ? hostPort.trim() : "";
  if (hote.length === 0) {
    return undefined;
  }
  const numero = Number(hote);
  if (!Number.isFinite(numero) || numero < 1 || numero > 65_535) {
    return undefined;
  }
  return numero;
}

/**
 * Dérive les ports hôte réellement publiés (non limités à la loopback) depuis l’inspection Docker.
 */
export function extrairePublicationsHoteNonLoopbackDepuisInspection(
  inspection: ContainerInspectInfo,
): PublicationHotePareFeu[] {
  const ports = inspection.NetworkSettings?.Ports;
  if (ports === undefined || ports === null || typeof ports !== "object") {
    return [];
  }

  const vu = new Map<string, PublicationHotePareFeu>();

  for (const [clePort, liaisons] of Object.entries(ports)) {
    const correspondance = extraireProtocoleDepuisClePort(clePort);
    if (!correspondance) {
      continue;
    }
    const protocole = correspondance;
    if (!Array.isArray(liaisons) || liaisons.length === 0) {
      continue;
    }
    /**
     * Liaison Docker : HostIp vide signifie souvent « toutes les interfaces » (équivalent 0.0.0.0),
     * pas la loopback ; on n’ignore que lorsque toutes les liaisons sont explicitement localhost.
     */
    const uniquementLoopback = liaisons.every((liaison) =>
      liaisonViseSeulementLoopback(liaison.HostIp),
    );
    if (uniquementLoopback) {
      continue;
    }
    for (const liaison of liaisons) {
      const numero = extraireNumeroPortHote(liaison.HostPort);
      if (numero === undefined) {
        continue;
      }
      const cleUnique = `${protocole}:${String(numero)}`;
      vu.set(cleUnique, { numero, protocole });
    }
  }

  return [...vu.values()];
}
