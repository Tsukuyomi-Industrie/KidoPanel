/**
 * Séquence commune après une création HTTP réussie sur le moteur : persistance Prisma avec conteneur
 * créé en statut arrêté, propriété réseau/conteneur puis tentative de démarrage HTTP.
 * Les callbacks conservent les types d’erreur métier et les champs Prisma propres à chaque service.
 */
export async function persisterConteneurCreeEtDemarrageSurMoteur(params: {
  ligneId: string;
  utilisateurId: string;
  idDocker: string;
  identifiantRequeteHttp: string;
  persisterConteneurStatutStopAvecIdentifiant: (
    ligneId: string,
    containerId: string,
  ) => Promise<void>;
  enregistrerProprietePourConteneur: (
    utilisateurId: string,
    containerId: string,
  ) => Promise<void>;
  posterDemarrage: (
    containerId: string,
    identifiantRequeteHttp: string,
  ) => Promise<Response>;
  persisterErreurApresEchecDemarrage: (
    ligneId: string,
    corpsReponseDemarrage: string,
  ) => Promise<void>;
  leverErreurApresEchecDemarrage: (
    statutHttpReponseDemarrage: number,
    corpsReponseDemarrage: string,
  ) => Error;
}): Promise<void> {
  await params.persisterConteneurStatutStopAvecIdentifiant(
    params.ligneId,
    params.idDocker,
  );
  await params.enregistrerProprietePourConteneur(
    params.utilisateurId,
    params.idDocker,
  );

  const reponseDemarrage = await params.posterDemarrage(
    params.idDocker,
    params.identifiantRequeteHttp,
  );
  const texteDemarrage = await reponseDemarrage.text();
  if (!reponseDemarrage.ok) {
    await params.persisterErreurApresEchecDemarrage(
      params.ligneId,
      texteDemarrage,
    );
    throw params.leverErreurApresEchecDemarrage(
      reponseDemarrage.status,
      texteDemarrage,
    );
  }
}

/**
 * Fabrique la mise à jour Prisma « conteneur créé, encore arrêté » réutilisable par les services jeu et web.
 */
export function creerPersisterConteneurStatutStopAvecIdentifiant<
  D extends {
    mettreAJour(
      ligneId: string,
      ligne: { containerId: string; status: "STOPPED" },
    ): Promise<unknown>;
  },
>(depot: D) {
  return async (ligneId: string, containerId: string): Promise<void> => {
    await depot.mettreAJour(ligneId, {
      containerId,
      status: "STOPPED",
    });
  };
}

/**
 * Délégation typée vers `enregistrerProprietePourConteneur` pour éviter les lambdas copiées entre services.
 */
export function creerEnregistrerProprietePourConteneurDelegue<
  P extends {
    enregistrerProprietePourConteneur(
      utilisateurId: string,
      containerId: string,
    ): Promise<void>;
  },
>(depotPropriete: P) {
  return (utilisateurId: string, containerId: string): Promise<void> =>
    depotPropriete.enregistrerProprietePourConteneur(utilisateurId, containerId);
}

/**
 * Délégation typée vers `posterDemarrage` du client moteur HTTP.
 */
export function creerPosterDemarrageSurMoteurDelegue<
  C extends {
    posterDemarrage(
      containerId: string,
      identifiantRequeteHttp: string,
    ): Promise<Response>;
  },
>(clientMoteur: C) {
  return (containerId: string, identifiantRequeteHttp: string): Promise<Response> =>
    clientMoteur.posterDemarrage(containerId, identifiantRequeteHttp);
}
