import type { PrismaClient } from "@kidopanel/database";
import { ErreurMetierWebInstance } from "../erreurs/erreurs-metier-web-instance.js";

async function compterInstancesUtilisateur(
  db: PrismaClient,
  userId: string,
): Promise<number> {
  const [nj, nw] = await Promise.all([
    db.gameServerInstance.count({ where: { userId } }),
    db.webInstance.count({ where: { userId } }),
  ]);
  return nj + nw;
}

/**
 * Vérifie les plafonds UserQuota avant une nouvelle instance web (nombre total et mémoire max par instance).
 */
export async function validerQuotasPourNouvelleInstanceWeb(
  db: PrismaClient,
  userId: string,
  memoireDemandeeMb: number,
  disqueDemandeGb: number,
): Promise<void> {
  const quota = await db.userQuota.findUnique({ where: { userId } });
  const maxInstances = quota?.maxInstances ?? 3;
  const maxMemoryMb = quota?.maxMemoryMb ?? 2048;
  const maxDiskGb = quota?.maxDiskGb ?? 20;
  if (memoireDemandeeMb > maxMemoryMb) {
    throw new ErreurMetierWebInstance(
      "QUOTA_MEMOIRE_DEPASSEE",
      `La mémoire demandée dépasse le plafond autorisé pour votre compte (${String(maxMemoryMb)} Mo).`,
      422,
    );
  }
  if (disqueDemandeGb > maxDiskGb) {
    throw new ErreurMetierWebInstance(
      "QUOTA_DISQUE_DEPASSE",
      `Le disque demandé dépasse le plafond autorisé pour votre compte (${String(maxDiskGb)} Go).`,
      422,
    );
  }
  const nombre = await compterInstancesUtilisateur(db, userId);
  if (nombre >= maxInstances) {
    throw new ErreurMetierWebInstance(
      "QUOTA_INSTANCE_DEPASSE",
      `Nombre maximal d’instances atteint (${String(maxInstances)}).`,
      422,
    );
  }
}
