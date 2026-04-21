import {
  type PrismaClient,
  DepotReseauInterneUtilisateurPartage,
} from "@kidopanel/database";

/** Lecture des ponts réseau créés par l’utilisateur pour rattacher une instance jeu au bon nom Docker. */
export class DepotReseauInterneUtilisateur extends DepotReseauInterneUtilisateurPartage {
  constructor(db: PrismaClient) {
    super(db);
  }
}
