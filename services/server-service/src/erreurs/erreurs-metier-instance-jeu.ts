/** Erreurs métier du service instances jeu : codes stables pour traduction HTTP homogène. */
export type CodeErreurMetierInstanceJeux =
  | "INSTANCE_JEU_NON_TROUVEE"
  | "INSTANCE_JEU_ACCES_REFUSE"
  | "TYPE_JEU_NON_PRIS_EN_CHARGE"
  | "ENVIRONNEMENT_INSTANCE_INCOMPLET"
  | "IDENTITE_INTERNE_MANQUANTE"
  | "ROLE_LECTURE_SEULE_MUTATION_INTERDITE"
  | "MOTEUR_CONTENEURS_ERREUR"
  | "RESEAU_INTERNE_UTILISATEUR_INTROUVABLE"
  | "QUOTA_RESSOURCES_DEPASSE"
  | "RESSOURCES_MACHINE_INSUFFISANTES";

/** Exception métier avec statut HTTP associé pour réponses JSON cohérentes. */
export class ErreurMetierInstanceJeux extends Error {
  constructor(
    readonly codeMetier: CodeErreurMetierInstanceJeux,
    message: string,
    readonly statutHttp: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ErreurMetierInstanceJeux";
  }
}
