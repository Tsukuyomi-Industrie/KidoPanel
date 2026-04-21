import type { PrismaClient } from "@prisma/client";

/**
 * Sonde PostgreSQL avec une requête minimale pour les endpoints `/health` des services métier.
 */
export async function sonderPostgreSqlPourRouteSante(
  client: PrismaClient,
): Promise<boolean> {
  try {
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
