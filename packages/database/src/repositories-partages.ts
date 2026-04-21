import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

/** Repository partagé pour retrouver un réseau interne appartenant à un utilisateur. */
export class DepotReseauInterneUtilisateurPartage {
  constructor(private readonly db: PrismaClient) {}

  async trouverPourUtilisateur(idReseau: string, utilisateurId: string) {
    return this.db.userInternalNetwork.findFirst({
      where: { id: idReseau, userId: utilisateurId },
    });
  }
}

/** Repository partagé pour relier un conteneur Docker à son propriétaire applicatif. */
export class DepotProprieteConteneurPartage {
  constructor(private readonly db: PrismaClient) {}

  async enregistrerProprietePourConteneur(
    utilisateurId: string,
    identifiantConteneurDocker: string,
  ): Promise<void> {
    await this.db.containerOwnership.create({
      data: {
        id: randomUUID(),
        userId: utilisateurId,
        containerId: identifiantConteneurDocker.trim(),
      },
    });
  }

  async retirerProprieteUtilisateurPourConteneur(
    utilisateurId: string,
    identifiantConteneurDocker: string,
  ): Promise<void> {
    const idNettoye = identifiantConteneurDocker.trim();
    await this.db.containerOwnership.deleteMany({
      where: {
        userId: utilisateurId,
        containerId: idNettoye,
      },
    });
  }
}
