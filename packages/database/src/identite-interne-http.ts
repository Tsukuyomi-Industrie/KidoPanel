export type RoleUtilisateurInterne = "ADMIN" | "USER" | "VIEWER";

const EN_TETE_UTILISATEUR = "x-kidopanel-utilisateur-id";
const EN_TETE_ROLE = "x-kidopanel-role-utilisateur";

/** Lit les en-têtes internes injectés par la passerelle pour identifier l’utilisateur et son rôle. */
export function lireIdentiteInterneDepuisEnTetes(getHeader: (nom: string) => string | undefined): {
  utilisateurId: string | undefined;
  role: RoleUtilisateurInterne;
} {
  const utilisateurId = getHeader(EN_TETE_UTILISATEUR)?.trim();
  const roleBrut = getHeader(EN_TETE_ROLE)?.trim().toUpperCase();
  const role: RoleUtilisateurInterne =
    roleBrut === "ADMIN" || roleBrut === "USER" || roleBrut === "VIEWER"
      ? roleBrut
      : "USER";
  return { utilisateurId, role };
}
