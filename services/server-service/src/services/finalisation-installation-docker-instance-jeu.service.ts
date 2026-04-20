import type { GameServerInstance } from "@kidopanel/database";
import type { GabaritJeuCatalogueInstance } from "@kidopanel/container-catalog";
import type { DepotInstanceServeur } from "../repositories/depot-instance-serveur.repository.js";
import type { DepotProprieteConteneurInstance } from "../repositories/depot-propriete-conteneur-instance.repository.js";
import type { ClientMoteurConteneursHttp } from "./client-moteur-conteneurs-http.service.js";
import { ErreurMetierInstanceJeux } from "../erreurs/erreurs-metier-instance-jeu.js";
import { synchroniserPortInstanceApresDemarrageSurMoteur } from "./synchroniser-port-instance-apres-demarrage-moteur.service.js";

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
  /** Nom Docker du pont utilisateur (`kidopanel-unet-…`) lorsque la création cible un réseau dédié. */
  reseauBridgeNom?: string;
  reseauDualAvecKidopanel?: boolean;
  reseauPrimaireKidopanel?: boolean;
}): Promise<GameServerInstance> {
  const { depot, depotPropriete, clientMoteur, ligne, gabarit, fusionEnv } =
    params;
  const nomDocker = `kpjeu-${ligne.id.replaceAll("-", "").slice(0, 22)}`;
  const corpsDocker = clientMoteur.construireCorpsCreationDocker({
    nomConteneur: nomDocker,
    gabarit,
    memoireMb: ligne.memoryMb,
    coeursCpu: ligne.cpuCores,
    variablesEnv: fusionEnv,
    ...(params.reseauBridgeNom !== undefined && params.reseauBridgeNom.trim().length > 0
      ? { reseauBridgeNom: params.reseauBridgeNom.trim() }
      : {}),
    ...(params.reseauDualAvecKidopanel === true
      ? { reseauDualAvecKidopanel: true }
      : {}),
    ...(params.reseauPrimaireKidopanel === false
      ? { reseauPrimaireKidopanel: false }
      : {}),
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
      reponseMoteurStatutOuDefaut502(reponseCreation.status),
      { corpsAmont: texteCreation.slice(0, 2000) },
    );
  }

  let idDocker: string;
  try {
    idDocker = extraireIdentifiantConteneurDepuisCreation(texteCreation);
  } catch (error_) {
    if (error_ instanceof ErreurMetierInstanceJeux) {
      throw error_;
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
      reponseMoteurStatutOuDefaut502(reponseDemarrage.status),
    );
  }

  const ligneDemarree = await depot.mettreAJour(ligne.id, {
    status: "RUNNING",
    startedAt: new Date(),
    stoppedAt: null,
  });
  return synchroniserPortInstanceApresDemarrageSurMoteur({
    depot,
    clientMoteur,
    ligne: ligneDemarree,
    identifiantRequeteHttp: params.identifiantRequeteHttp,
  });
}

function reponseMoteurStatutOuDefaut502(statut: number): number {
  return statut >= 400 && statut < 600 ? statut : 502;
}

function extraireIdentifiantConteneurDepuisCreation(texteCreation: string): string {
  const parse = JSON.parse(texteCreation) as { id?: unknown };
  if (typeof parse.id !== "string" || parse.id.length === 0) {
    throw new ErreurMetierInstanceJeux(
      "MOTEUR_CONTENEURS_ERREUR",
      "Réponse moteur sans identifiant conteneur.",
      502,
    );
  }
  return parse.id;
}
