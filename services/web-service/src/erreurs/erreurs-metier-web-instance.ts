/** Codes d’erreur métier du service instances web pour des réponses JSON homogènes. */
export type CodeErreurMetierWebInstance =
  | "INSTANCE_WEB_NON_TROUVEE"
  | "INSTANCE_WEB_ACCES_REFUSE"
  | "ROLE_LECTURE_SEULE_MUTATION_INTERDITE"
  | "MOTEUR_CONTENEURS_ERREUR"
  | "QUOTA_INSTANCE_DEPASSE"
  | "QUOTA_MEMOIRE_DEPASSEE"
  | "QUOTA_DISQUE_DEPASSE"
  | "GABARIT_WEB_INCOMPLET"
  | "DOMAIN_PROXY_NON_TROUVE"
  | "PROXY_NGINX_INDISPONIBLE"
  | "PROXY_REGENERATION_ECHEC"
  | "RESEAU_INTERNE_UTILISATEUR_INTROUVABLE";

/** Exception métier avec statut HTTP pour le cycle de vie des instances web. */
export class ErreurMetierWebInstance extends Error {
  constructor(
    readonly codeMetier: CodeErreurMetierWebInstance,
    message: string,
    readonly statutHttp: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ErreurMetierWebInstance";
  }
}
