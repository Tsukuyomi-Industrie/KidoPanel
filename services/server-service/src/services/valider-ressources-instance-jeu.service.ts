import { cpus, totalmem } from "node:os";
import { statfsSync } from "node:fs";
import type { PrismaClient } from "@kidopanel/database";
import { ErreurMetierInstanceJeux } from "../erreurs/erreurs-metier-instance-jeu.js";

type QuotasRessources = {
  maxInstances: number;
  maxMemoryMb: number;
  maxCpuCores: number;
  maxDiskGb: number;
};

function lireQuotaAvecValeursParDefaut(entree: {
  maxInstances: number;
  maxMemoryMb: number;
  maxCpuCores: number;
  maxDiskGb: number;
} | null): QuotasRessources {
  if (entree === null) {
    return {
      maxInstances: 3,
      maxMemoryMb: 2048,
      maxCpuCores: 2,
      maxDiskGb: 20,
    };
  }
  return {
    maxInstances: entree.maxInstances,
    maxMemoryMb: entree.maxMemoryMb,
    maxCpuCores: entree.maxCpuCores,
    maxDiskGb: entree.maxDiskGb,
  };
}

function lireEspaceDisqueLibreGbApprox(): number | null {
  try {
    const stats = statfsSync("/");
    const octetsLibres = Number(stats.bavail) * Number(stats.bsize);
    if (!Number.isFinite(octetsLibres) || octetsLibres <= 0) {
      return null;
    }
    return octetsLibres / (1024 * 1024 * 1024);
  } catch {
    return null;
  }
}

/**
 * Vérifie quotas utilisateur et garde-fous machine avant création d’instance jeu.
 */
export async function validerRessourcesAvantCreationInstanceJeu(params: {
  db: PrismaClient;
  userId: string;
  memoryMb: number;
  cpuCores: number;
  diskGb: number;
}): Promise<void> {
  const [quotaBrut, nbJeux, nbWeb] = await Promise.all([
    params.db.userQuota.findUnique({
      where: { userId: params.userId },
      select: {
        maxInstances: true,
        maxMemoryMb: true,
        maxCpuCores: true,
        maxDiskGb: true,
      },
    }),
    params.db.gameServerInstance.count({ where: { userId: params.userId } }),
    params.db.webInstance.count({ where: { userId: params.userId } }),
  ]);
  const quota = lireQuotaAvecValeursParDefaut(quotaBrut);
  const nbTotal = nbJeux + nbWeb;
  if (nbTotal >= quota.maxInstances) {
    throw new ErreurMetierInstanceJeux(
      "QUOTA_RESSOURCES_DEPASSE",
      `Nombre maximal d’instances atteint (${String(quota.maxInstances)}).`,
      422,
    );
  }
  if (params.memoryMb > quota.maxMemoryMb) {
    throw new ErreurMetierInstanceJeux(
      "QUOTA_RESSOURCES_DEPASSE",
      `Mémoire demandée (${String(params.memoryMb)} Mo) supérieure au quota (${String(quota.maxMemoryMb)} Mo).`,
      422,
    );
  }
  if (params.cpuCores > quota.maxCpuCores) {
    throw new ErreurMetierInstanceJeux(
      "QUOTA_RESSOURCES_DEPASSE",
      `CPU demandés (${String(params.cpuCores)}) supérieurs au quota (${String(quota.maxCpuCores)}).`,
      422,
    );
  }
  if (params.diskGb > quota.maxDiskGb) {
    throw new ErreurMetierInstanceJeux(
      "QUOTA_RESSOURCES_DEPASSE",
      `Disque demandé (${String(params.diskGb)} Go) supérieur au quota (${String(quota.maxDiskGb)} Go).`,
      422,
    );
  }

  const memoireTotaleMb = totalmem() / (1024 * 1024);
  const plafondMemoireMachineMb = Math.floor(memoireTotaleMb * 0.9);
  if (params.memoryMb > plafondMemoireMachineMb) {
    throw new ErreurMetierInstanceJeux(
      "RESSOURCES_MACHINE_INSUFFISANTES",
      `Mémoire demandée (${String(params.memoryMb)} Mo) supérieure à la capacité machine conseillée (${String(plafondMemoireMachineMb)} Mo).`,
      422,
    );
  }

  const cœursMachine = cpus().length;
  if (params.cpuCores > cœursMachine) {
    throw new ErreurMetierInstanceJeux(
      "RESSOURCES_MACHINE_INSUFFISANTES",
      `CPU demandés (${String(params.cpuCores)}) supérieurs aux cœurs disponibles (${String(cœursMachine)}).`,
      422,
    );
  }

  const disqueLibreGb = lireEspaceDisqueLibreGbApprox();
  if (disqueLibreGb !== null && params.diskGb > Math.floor(disqueLibreGb)) {
    throw new ErreurMetierInstanceJeux(
      "RESSOURCES_MACHINE_INSUFFISANTES",
      `Disque demandé (${String(params.diskGb)} Go) supérieur à l’espace libre détecté (${String(Math.floor(disqueLibreGb))} Go).`,
      422,
    );
  }
}
