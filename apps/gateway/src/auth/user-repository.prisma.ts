import { Prisma, type PrismaClient } from "@kidopanel/database";

export type DonneesCreationUtilisateur = {
  id: string;
  email: string;
  password: string;
};

/**
 * Persistance des comptes via Prisma ; reçoit le client en injection pour les tests et un point d’extension unique.
 */
export class UserRepository {
  constructor(private readonly db: PrismaClient) {}

  findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  async create(donnees: DonneesCreationUtilisateur) {
    try {
      return await this.db.user.create({
        data: {
          id: donnees.id,
          email: donnees.email,
          password: donnees.password,
        },
      });
    } catch (erreur) {
      if (
        erreur instanceof Prisma.PrismaClientKnownRequestError &&
        erreur.code === "P2002"
      ) {
        throw new Error("EMAIL_DEJA_UTILISE");
      }
      throw erreur;
    }
  }
}
