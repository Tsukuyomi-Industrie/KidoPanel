import type { WebInstance } from "@kidopanel/database";
import type { DepotWebInstance } from "../repositories/depot-web-instance.repository.js";
import type { DepotProprieteConteneur } from "../repositories/depot-propriete-conteneur.repository.js";
import type { ClientMoteurWebHttp } from "./client-moteur-web.service.js";
import { ErreurMetierWebInstance } from "../erreurs/erreurs-metier-web-instance.js";

export type ResultatFinalisationInstallationWeb = {
  instance: WebInstance;
  ipReseauInterne?: string;
};

/**
 * Crée le conteneur applicatif et démarre l’instance après une ligne Prisma en statut INSTALLING.
 */
export async function finaliserInstallationConteneurWeb(params: {
  depot: DepotWebInstance;
  depotPropriete: DepotProprieteConteneur;
  clientMoteur: ClientMoteurWebHttp;
  ligne: WebInstance;
  corpsDocker: Record<string, unknown>;
  identifiantRequeteHttp: string;
}): Promise<ResultatFinalisationInstallationWeb> {
  const { depot, depotPropriete, clientMoteur, ligne, corpsDocker } = params;

  let reponseCreation: Response;
  try {
    reponseCreation = await clientMoteur.posterCreation(
      corpsDocker,
      params.identifiantRequeteHttp,
    );
  } catch {
    await depot.mettreAJour(ligne.id, { status: "ERROR" });
    throw new ErreurMetierWebInstance(
      "MOTEUR_CONTENEURS_ERREUR",
      "Impossible de joindre le moteur de conteneurs.",
      502,
    );
  }

  const texteCreation = await reponseCreation.text();
  if (!reponseCreation.ok) {
    await depot.mettreAJour(ligne.id, { status: "ERROR" });
    throw new ErreurMetierWebInstance(
      "MOTEUR_CONTENEURS_ERREUR",
      "Création du conteneur refusée par le moteur.",
      reponseCreation.status >= 400 && reponseCreation.status < 600
        ? reponseCreation.status
        : 502,
      { corpsAmont: texteCreation.slice(0, 2000) },
    );
  }

  let idDocker: string;
  let ipReseauInterne: string | undefined;
  try {
    const parse = JSON.parse(texteCreation) as {
      id?: unknown;
      ipReseauInterne?: unknown;
    };
    if (typeof parse.id !== "string" || parse.id.length === 0) {
      throw new ErreurMetierWebInstance(
        "MOTEUR_CONTENEURS_ERREUR",
        "Réponse moteur sans identifiant conteneur.",
        502,
      );
    }
    idDocker = parse.id;
    if (typeof parse.ipReseauInterne === "string" && parse.ipReseauInterne.length > 0) {
      ipReseauInterne = parse.ipReseauInterne;
    }
  } catch (error_) {
    if (error_ instanceof ErreurMetierWebInstance) {
      throw error_;
    }
    await depot.mettreAJour(ligne.id, { status: "ERROR" });
    throw new ErreurMetierWebInstance(
      "MOTEUR_CONTENEURS_ERREUR",
      "Réponse JSON du moteur illisible après création.",
      502,
    );
  }

  await depot.mettreAJour(ligne.id, {
    containerId: idDocker,
    status: "STOPPED",
  });

  await depotPropriete.enregistrerProprietePourConteneur(ligne.userId, idDocker);

  const reponseDemarrage = await clientMoteur.posterDemarrage(
    idDocker,
    params.identifiantRequeteHttp,
  );
  const texteDemarrage = await reponseDemarrage.text();
  if (!reponseDemarrage.ok) {
    await depot.mettreAJour(ligne.id, { status: "ERROR" });
    throw new ErreurMetierWebInstance(
      "MOTEUR_CONTENEURS_ERREUR",
      "Le conteneur a été créé mais le démarrage a échoué.",
      reponseDemarrage.status >= 400 && reponseDemarrage.status < 600
        ? reponseDemarrage.status
        : 502,
      { corpsAmont: texteDemarrage.slice(0, 1000) },
    );
  }

  const instanceFinale = await depot.mettreAJour(ligne.id, {
    status: "RUNNING",
  });
  return {
    instance: instanceFinale,
    ...(ipReseauInterne === undefined ? {} : { ipReseauInterne }),
  };
}
