import {
  type PrismaClient,
  DepotProprieteConteneurPartage,
} from "@kidopanel/database";

/**
 * Enregistre la propriété Docker côté passerelle pour les conteneurs créés par le service web.
 */
export class DepotProprieteConteneur extends DepotProprieteConteneurPartage {
  constructor(db: PrismaClient) {
    super(db);
  }
}
