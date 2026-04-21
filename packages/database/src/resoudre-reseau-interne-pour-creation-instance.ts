/** Résultat lorsque l’utilisateur ne sélectionne pas de réseau interne dans le formulaire de création. */
export type ResolutionReseauSansSelection = {
  mode: "sans_selection";
};

/** Réseau interne validé avec le nom Docker du pont à passer au corps de création conteneur. */
export type ResolutionReseauAvecPont = {
  mode: "avec_reseau";
  idReseau: string;
  nomPontDocker: string;
};

export type ResolutionReseauPourCreationInstance =
  | ResolutionReseauSansSelection
  | ResolutionReseauAvecPont;

/**
 * Résout un réseau interne utilisateur facultatif lors de la création d’instance jeu ou web.
 */
export async function resoudreReseauInternePourCreationInstance<
  TEnregistrement extends { nomDocker: string },
>(
  params: {
    identifiantReseauInterneBrut: string | undefined;
    utilisateurIdProprietaire: string;
    trouverPourUtilisateur: (
      idReseau: string,
      utilisateurId: string,
    ) => Promise<TEnregistrement | null>;
    leverSiReseauIntrouvable: () => Error;
  },
): Promise<ResolutionReseauPourCreationInstance> {
  const idReseauTrim = params.identifiantReseauInterneBrut?.trim();
  if (idReseauTrim === undefined || idReseauTrim.length === 0) {
    return { mode: "sans_selection" };
  }
  const enregistrementReseau = await params.trouverPourUtilisateur(
    idReseauTrim,
    params.utilisateurIdProprietaire,
  );
  if (enregistrementReseau === null) {
    throw params.leverSiReseauIntrouvable();
  }
  return {
    mode: "avec_reseau",
    idReseau: idReseauTrim,
    nomPontDocker: enregistrementReseau.nomDocker,
  };
}
