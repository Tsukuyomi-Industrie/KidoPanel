import type { PrismaClient } from "@kidopanel/database";
import { prefixeDocker } from "./docker-identifiant-conteneur.js";

/**
 * Stockage des associations utilisateur ↔ identifiant Docker ; le moteur de conteneurs reste la source de vérité runtime.
 */
export class ContainerOwnershipRepository {
  constructor(private readonly db: PrismaClient) {}

  async addOwnership(userId: string, containerId: string): Promise<void> {
    await this.db.containerOwnership.create({
      data: {
        userId,
        containerId: containerId.trim(),
      },
    });
  }

  async getContainerIdsByUser(userId: string): Promise<string[]> {
    const lignes = await this.db.containerOwnership.findMany({
      where: { userId },
      select: { containerId: true },
    });
    return lignes.map((ligne: { containerId: string }) => ligne.containerId);
  }

  /**
   * Indique si une ligne de propriété existe pour cet utilisateur et un identifiant Docker équivalent (préfixe 12 caractères).
   */
  async userOwnsContainer(
    userId: string,
    containerId: string,
  ): Promise<boolean> {
    const p = prefixeDocker(containerId);
    const lignes = await this.db.$queryRaw<{ ok: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM "ContainerOwnership" co
        WHERE co."userId" = ${userId}::uuid
          AND LOWER(SUBSTRING(TRIM(co."containerId"), 1, 12)) = ${p}
      ) AS ok
    `;
    return Boolean(lignes[0]?.ok);
  }

  /**
   * Retire uniquement la ligne de propriété de l’utilisateur indiqué pour le conteneur cible (même règle de préfixe Docker que pour les lectures).
   */
  async removeOwnershipForUser(
    userId: string,
    containerId: string,
  ): Promise<void> {
    const p = prefixeDocker(containerId);
    await this.db.$executeRaw`
      DELETE FROM "ContainerOwnership"
      WHERE "userId" = ${userId}::uuid
        AND LOWER(SUBSTRING(TRIM("containerId"), 1, 12)) = ${p}
    `;
  }
}
