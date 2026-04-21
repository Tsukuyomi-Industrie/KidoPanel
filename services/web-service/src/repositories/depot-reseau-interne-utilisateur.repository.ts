import {
  type PrismaClient,
  DepotReseauInterneUtilisateurPartage,
} from "@kidopanel/database";

/** Résolution du nom Docker du pont utilisateur pour une instance web. */
export class DepotReseauInterneUtilisateur extends DepotReseauInterneUtilisateurPartage {
  constructor(db: PrismaClient) {
    super(db);
  }
}
