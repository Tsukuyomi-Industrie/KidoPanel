import {
  type PrismaClient,
  DepotProprieteConteneurPartage,
} from "@kidopanel/database";

/**
 * Associe les conteneurs créés par le service jeu aux comptes utilisateur pour le cloisonnement passerelle (`ContainerOwnership`).
 */
export class DepotProprieteConteneurInstance extends DepotProprieteConteneurPartage {
  constructor(db: PrismaClient) {
    super(db);
  }
}
