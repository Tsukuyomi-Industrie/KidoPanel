import type { RoleUtilisateurInterne } from "./identite-interne-http.js";

/**
 * Détermine si l’identité interne (rôle + utilisateur courant) peut agir sur une ressource
 * dont le propriétaire Prisma est `proprietaireId`.
 */
export function peutGererRessourcePourIdentiteInterne(
  role: RoleUtilisateurInterne,
  utilisateurCourantId: string,
  proprietaireId: string,
): boolean {
  if (role === "ADMIN") {
    return true;
  }
  return proprietaireId === utilisateurCourantId;
}

/**
 * Liste toutes les instances pour un administrateur, sinon uniquement celles du compte courant.
 */
export async function listerInstancesPourIdentiteInterne<T>(params: {
  role: RoleUtilisateurInterne;
  utilisateurId: string;
  listerTous: () => Promise<T[]>;
  listerParUtilisateur: (utilisateurId: string) => Promise<T[]>;
}): Promise<T[]> {
  if (params.role === "ADMIN") {
    return params.listerTous();
  }
  return params.listerParUtilisateur(params.utilisateurId);
}

/**
 * Charge une ligne d’instance par identifiant puis applique le contrôle d’accès propriétaire / admin.
 */
export async function obtenirInstanceParIdAvecControleAcces<T extends { userId: string }>(
  params: {
    instanceId: string;
    utilisateurId: string;
    role: RoleUtilisateurInterne;
    trouverParId: (id: string) => Promise<T | null>;
    leverSiIntrouvable: () => Error;
    leverSiAccesRefuse: () => Error;
  },
): Promise<T> {
  const ligne = await params.trouverParId(params.instanceId);
  if (!ligne) {
    throw params.leverSiIntrouvable();
  }
  if (
    !peutGererRessourcePourIdentiteInterne(
      params.role,
      params.utilisateurId,
      ligne.userId,
    )
  ) {
    throw params.leverSiAccesRefuse();
  }
  return ligne;
}

/**
 * Liste via un dépôt standard (`listerTous` / `listerParUtilisateur`) selon le rôle interne courant.
 */
export async function listerDepuisDepotPourIdentiteInterne<T>(
  depot: {
    listerTous(): Promise<T[]>;
    listerParUtilisateur(utilisateurId: string): Promise<T[]>;
  },
  params: {
    utilisateurId: string;
    role: RoleUtilisateurInterne;
  },
): Promise<T[]> {
  return listerInstancesPourIdentiteInterne({
    role: params.role,
    utilisateurId: params.utilisateurId,
    listerTous: () => depot.listerTous(),
    listerParUtilisateur: (id) => depot.listerParUtilisateur(id),
  });
}

/**
 * Détail d’instance avec contrôle d’accès à partir d’un dépôt `trouverParId` et d’erreurs métier injectées.
 */
export async function obtenirDetailDepuisDepotPourIdentiteInterne<
  T extends { userId: string },
>(
  depot: { trouverParId(instanceId: string): Promise<T | null> },
  params: {
    utilisateurId: string;
    role: RoleUtilisateurInterne;
    instanceId: string;
  },
  erreursMetier: {
    leverSiIntrouvable: () => Error;
    leverSiAccesRefuse: () => Error;
  },
): Promise<T> {
  return obtenirInstanceParIdAvecControleAcces({
    instanceId: params.instanceId,
    utilisateurId: params.utilisateurId,
    role: params.role,
    trouverParId: (id) => depot.trouverParId(id),
    leverSiIntrouvable: erreursMetier.leverSiIntrouvable,
    leverSiAccesRefuse: erreursMetier.leverSiAccesRefuse,
  });
}
