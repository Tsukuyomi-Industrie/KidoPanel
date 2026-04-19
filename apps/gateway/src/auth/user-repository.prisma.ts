import {
  PrismaClientKnownRequestError,
  type PrismaClient,
  type UserRole,
} from "@kidopanel/database";

export type DonneesCreationUtilisateur = {
  id: string;
  email: string;
  password: string;
  /** Rôle initial ; défaut métier ADMIN uniquement pour le tout premier compte créé dans la base vide. */
  role?: UserRole;
};

/**
 * Persistance des comptes via Prisma ; reçoit le client en injection pour les tests et un point d’extension unique.
 */
export class UserRepository {
  constructor(private readonly db: PrismaClient) {}

  findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  /** Compte les comptes persistés pour décider du rôle du premier administrateur créé automatiquement. */
  async compter(): Promise<number> {
    return this.db.user.count();
  }

  async create(donnees: DonneesCreationUtilisateur) {
    try {
      return await this.db.user.create({
        data: {
          id: donnees.id,
          email: donnees.email,
          password: donnees.password,
          ...(donnees.role === undefined ? {} : { role: donnees.role }),
          quotas: { create: {} },
        },
      });
    } catch (error_: unknown) {
      if (
        error_ instanceof PrismaClientKnownRequestError &&
        error_.code === "P2002"
      ) {
        throw new Error("EMAIL_DEJA_UTILISE");
      }
      throw error_;
    }
  }
}
