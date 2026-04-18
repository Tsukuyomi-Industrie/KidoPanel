import type { PrismaClient, GameType, InstanceStatus } from "@kidopanel/database";
import { Prisma } from "@kidopanel/database";

type DonneesNouvelleInstance = {
  id: string;
  userId: string;
  name: string;
  gameType: GameType;
  memoryMb: number;
  cpuCores: number;
  diskGb: number;
  env: Prisma.InputJsonValue;
  status: InstanceStatus;
  installLogs: string | null;
  reseauInterneUtilisateurId?: string | null;
  attacherReseauKidopanelComplement?: boolean;
};

/**
 * Accès Prisma aux instances de serveur de jeu : seul point d’accès base pour ce service.
 */
export class DepotInstanceServeur {
  constructor(private readonly db: PrismaClient) {}

  async trouverParId(id: string) {
    return this.db.gameServerInstance.findUnique({ where: { id } });
  }

  async listerParUtilisateur(userId: string) {
    return this.db.gameServerInstance.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async listerTous() {
    return this.db.gameServerInstance.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async creer(d: DonneesNouvelleInstance) {
    return this.db.gameServerInstance.create({ data: d });
  }

  async mettreAJour(
    id: string,
    donnees: Prisma.GameServerInstanceUpdateInput,
  ) {
    return this.db.gameServerInstance.update({ where: { id }, data: donnees });
  }

  async supprimer(id: string) {
    await this.db.gameServerInstance.delete({ where: { id } });
  }
}
