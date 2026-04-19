import type { PrismaClient } from "@kidopanel/database";
import type { ContainerOwnershipRepository } from "../../auth/container-ownership-repository.prisma.js";
import { filtrerConteneursVisiblesPourUtilisateur } from "../../auth/verify-container-ownership.js";
import type { UtilisateurPublic } from "../../auth/user.types.js";
import { getContainerEngineBaseUrl } from "../../config/gateway-env.js";
import { EN_TETE_ID_REQUETE_INTERNE } from "../constantes-correlation-http.js";

type ResumeMoteur = { id: string; state?: string };

type ReponseListeMoteur = { containers?: ResumeMoteur[] };

/**
 * Agrège l’état PostgreSQL, la joignabilité du moteur Docker et les volumes de conteneurs visibles pour l’utilisateur.
 */
export async function collecterIndicateursTableauPanel(params: {
  prisma: PrismaClient;
  depotPropriete: ContainerOwnershipRepository;
  utilisateur: UtilisateurPublic;
  identifiantRequete: string;
}): Promise<{
  postgresql: { joignable: boolean; latenceMs?: number; message?: string };
  moteurDocker: { joignable: boolean; message?: string };
  conteneurs: { total: number; enLigne: number; horsLigne: number };
}> {
  const postgresql = await sonderPostgresql(params.prisma);
  const moteurDocker = await sonderMoteurDocker(params.identifiantRequete);
  const conteneurs = await compterConteneursUtilisateur({
    utilisateur: params.utilisateur,
    depotPropriete: params.depotPropriete,
    identifiantRequete: params.identifiantRequete,
  });
  return { postgresql, moteurDocker, conteneurs };
}

async function sonderPostgresql(prisma: PrismaClient): Promise<{
  joignable: boolean;
  latenceMs?: number;
  message?: string;
}> {
  const debut = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { joignable: true, latenceMs: Date.now() - debut };
  } catch (error_) {
    const message =
      error_ instanceof Error ? error_.message : "Requête de sonde impossible.";
    return { joignable: false, message };
  }
}

async function sonderMoteurDocker(identifiantRequete: string): Promise<{
  joignable: boolean;
  message?: string;
}> {
  const base = getContainerEngineBaseUrl();
  const url = `${base}/health`;
  try {
    const reponse = await fetch(url, {
      method: "GET",
      headers: { [EN_TETE_ID_REQUETE_INTERNE]: identifiantRequete },
      signal: AbortSignal.timeout(8000),
    });
    if (!reponse.ok) {
      return {
        joignable: false,
        message: `Moteur injoignable ou en erreur (HTTP ${String(reponse.status)}).`,
      };
    }
    return { joignable: true };
  } catch (error_) {
    const message =
      error_ instanceof Error ? error_.message : "Appel vers le moteur impossible.";
    return { joignable: false, message };
  }
}

async function compterConteneursUtilisateur(params: {
  utilisateur: UtilisateurPublic;
  depotPropriete: ContainerOwnershipRepository;
  identifiantRequete: string;
}): Promise<{ total: number; enLigne: number; horsLigne: number }> {
  const base = getContainerEngineBaseUrl();
  const url = `${base}/containers?all=true`;
  try {
    const reponse = await fetch(url, {
      method: "GET",
      headers: { [EN_TETE_ID_REQUETE_INTERNE]: params.identifiantRequete },
      signal: AbortSignal.timeout(12_000),
    });
    if (!reponse.ok) {
      return { total: 0, enLigne: 0, horsLigne: 0 };
    }
    const brut = (await reponse.json()) as ReponseListeMoteur;
    const listeBrute = Array.isArray(brut.containers) ? brut.containers : [];
    const normalise = listeBrute.filter(
      (e): e is ResumeMoteur =>
        e !== null &&
        typeof e === "object" &&
        typeof (e as { id?: unknown }).id === "string" &&
        (e as { id: string }).id.length > 0,
    );
    const filtrees = await filtrerConteneursVisiblesPourUtilisateur(
      params.depotPropriete,
      params.utilisateur,
      normalise,
    );
    const total = filtrees.length;
    const enLigne = filtrees.filter((c) => c.state === "running").length;
    return { total, enLigne, horsLigne: total - enLigne };
  } catch {
    return { total: 0, enLigne: 0, horsLigne: 0 };
  }
}
