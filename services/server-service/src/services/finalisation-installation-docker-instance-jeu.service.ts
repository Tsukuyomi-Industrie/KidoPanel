import type { GameServerInstance } from "@kidopanel/database";
import type { GabaritJeuCatalogueInstance } from "@kidopanel/container-catalog";
import type { DepotInstanceServeur } from "../repositories/depot-instance-serveur.repository.js";
import type { DepotProprieteConteneurInstance } from "../repositories/depot-propriete-conteneur-instance.repository.js";
import type { ClientMoteurConteneursHttp } from "./client-moteur-conteneurs-http.service.js";
import { ErreurMetierInstanceJeux } from "../erreurs/erreurs-metier-instance-jeu.js";

/**
 * Crée le conteneur sur le moteur HTTP et démarre l’instance après persistance Prisma en statut INSTALLING.
 */
export async function finaliserInstallationConteneurDockerInstanceJeux(params: {
  depot: DepotInstanceServeur;
  depotPropriete: DepotProprieteConteneurInstance;
  clientMoteur: ClientMoteurConteneursHttp;
  ligne: GameServerInstance;
  gabarit: GabaritJeuCatalogueInstance;
  fusionEnv: Record<string, string>;
  identifiantRequeteHttp: string;
}): Promise<GameServerInstance> {
  const { depot, depotPropriete, clientMoteur, ligne, gabarit, fusionEnv } =
    params;
  const nomDocker = `kpjeu-${ligne.id.replace(/-/g, "").slice(0, 22)}`;
  const corpsDocker = clientMoteur.construireCorpsCreationDocker({
    nomConteneur: nomDocker,
    gabarit,
    memoireMb: ligne.memoryMb,
    coeursCpu: ligne.cpuCores,
    variablesEnv: fusionEnv,
  });

  let reponseCreation: Response;
  try {
    reponseCreation = await clientMoteur.posterCreation(
      corpsDocker,
      params.identifiantRequeteHttp,
    );
  } catch {
    await depot.mettreAJour(ligne.id, {
      status: "ERROR",
      installLogs: "Échec réseau vers le moteur de conteneurs.",
    });
    throw new ErreurMetierInstanceJeux(
      "MOTEUR_CONTENEURS_ERREUR",
      "Impossible de joindre le moteur de conteneurs.",
      502,
    );
  }

  const texteCreation = await reponseCreation.text();
  if (!reponseCreation.ok) {
    await depot.mettreAJour(ligne.id, {
      status: "ERROR",
      installLogs: texteCreation.slice(0, 8000),
    });
    throw new ErreurMetierInstanceJeux(
      "MOTEUR_CONTENEURS_ERREUR",
      "Création du conteneur refusée par le moteur.",
      reponseCreation.status >= 400 && reponseCreation.status < 600
        ? reponseCreation.status
        : 502,
      { corpsAmont: texteCreation.slice(0, 2000) },
    );
  }

  let idDocker: string;
  try {
    const parse = JSON.parse(texteCreation) as { id?: unknown };
    if (typeof parse.id !== "string" || parse.id.length === 0) {
      throw new ErreurMetierInstanceJeux(
        "MOTEUR_CONTENEURS_ERREUR",
        "Réponse moteur sans identifiant conteneur.",
        502,
      );
    }
    idDocker = parse.id;
  } catch (erreur) {
    if (erreur instanceof ErreurMetierInstanceJeux) {
      throw erreur;
    }
    await depot.mettreAJour(ligne.id, {
      status: "ERROR",
      installLogs: texteCreation.slice(0, 8000),
    });
    throw new ErreurMetierInstanceJeux(
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
    await depot.mettreAJour(ligne.id, {
      status: "ERROR",
      installLogs: texteDemarrage.slice(0, 8000),
    });
    throw new ErreurMetierInstanceJeux(
      "MOTEUR_CONTENEURS_ERREUR",
      "Le conteneur a été créé mais le démarrage a échoué.",
      reponseDemarrage.status >= 400 && reponseDemarrage.status < 600
        ? reponseDemarrage.status
        : 502,
    );
  }

  return depot.mettreAJour(ligne.id, {
    status: "RUNNING",
    startedAt: new Date(),
    stoppedAt: null,
  });
}
