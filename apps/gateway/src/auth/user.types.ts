/** Valeurs exposées dans le JWT et les réponses `/auth/*` pour la passerelle applicative. */
export type RoleUtilisateurKidoPanel = "ADMIN" | "USER" | "VIEWER";

/** Enregistrement utilisateur côté persistance (jamais exposé tel quel au client). */
export interface UtilisateurStocke {
  id: string;
  emailNormalise: string;
  hashMotDePasse: string;
  creeLeIso: string;
  role: RoleUtilisateurKidoPanel;
}

/** Représentation publique renvoyée après inscription ou dans le profil minimal du JWT. */
export interface UtilisateurPublic {
  id: string;
  email: string;
  role: RoleUtilisateurKidoPanel;
}
