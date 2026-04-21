import { randomUUID } from "node:crypto";
import type { GameType } from "@kidopanel/database";
import { Prisma } from "@kidopanel/database";
import type { DepotInstanceServeur } from "../repositories/depot-instance-serveur.repository.js";
import type { DepotProprieteConteneurInstance } from "../repositories/depot-propriete-conteneur-instance.repository.js";
import type { DepotReseauInterneUtilisateur } from "../repositories/depot-reseau-interne-utilisateur.repository.js";
import type { ClientMoteurConteneursHttp } from "./client-moteur-conteneurs-http.service.js";
import { resoudreGabaritJeuPourType } from "./mappage-gabarit-type-jeu.service.js";
import { validerEtFusionnerVariablesEnvJeux } from "./installateur-variables-env-jeu.service.js";
import { ErreurMetierInstanceJeux } from "../erreurs/erreurs-metier-instance-jeu.js";
import { finaliserInstallationConteneurDockerInstanceJeux } from "./finalisation-installation-docker-instance-jeu.service.js";
import { synchroniserPortInstanceApresDemarrageSurMoteur } from "./synchroniser-port-instance-apres-demarrage-moteur.service.js";
import type { PrismaClient } from "@kidopanel/database";
import { validerRessourcesAvantCreationInstanceJeu } from "./valider-ressources-instance-jeu.service.js";

type RoleInterne = "ADMIN" | "USER" | "VIEWER";

function peutGererInstance(
  role: RoleInterne,
  utilisateurCourantId: string,
  proprietaireInstanceId: string,
): boolean {
  if (role === "ADMIN") {
    return true;
  }
  return proprietaireInstanceId === utilisateurCourantId;
}

/**
 * Orchestre création Docker via le moteur HTTP et synchronise les statuts Prisma.
 */
export class CycleVieInstanceServeur {
  constructor(
    private readonly db: PrismaClient,
    private readonly depot: DepotInstanceServeur,
    private readonly depotPropriete: DepotProprieteConteneurInstance,
    private readonly clientMoteur: ClientMoteurConteneursHttp,
    private readonly depotReseauInterne: DepotReseauInterneUtilisateur,
  ) {}

  async listerPourIdentiteInterne(params: {
    utilisateurId: string;
    role: RoleInterne;
  }) {
    if (params.role === "ADMIN") {
      return this.depot.listerTous();
    }
    return this.depot.listerParUtilisateur(params.utilisateurId);
  }

  async obtenirDetailPourIdentiteInterne(params: {
    utilisateurId: string;
    role: RoleInterne;
    instanceId: string;
  }) {
    const ligne = await this.depot.trouverParId(params.instanceId);
    if (!ligne) {
      throw new ErreurMetierInstanceJeux(
        "INSTANCE_JEU_NON_TROUVEE",
        "Instance introuvable.",
        404,
      );
    }
    if (
      !peutGererInstance(params.role, params.utilisateurId, ligne.userId)
    ) {
      throw new ErreurMetierInstanceJeux(
        "INSTANCE_JEU_ACCES_REFUSE",
        "Accès à cette instance refusé.",
        403,
      );
    }
    return ligne;
  }

  async creerEtOrchestrerInstallation(params: {
    utilisateurIdProprietaire: string;
    role: RoleInterne;
    nomBrut: string;
    gameType: GameType;
    memoryMb: number;
    cpuCores: number;
    diskGb: number;
    variablesEnvBrutes: Record<string, string>;
    identifiantRequeteHttp: string;
    reseauInterneUtilisateurId?: string;
    attacherReseauKidopanelComplement?: boolean;
    reseauPrimaireKidopanel?: boolean;
  }) {
    if (params.role === "VIEWER") {
      throw new ErreurMetierInstanceJeux(
        "ROLE_LECTURE_SEULE_MUTATION_INTERDITE",
        "Le rôle observateur ne permet pas de créer une instance.",
        403,
      );
    }
    await validerRessourcesAvantCreationInstanceJeu({
      db: this.db,
      userId: params.utilisateurIdProprietaire,
      memoryMb: params.memoryMb,
      cpuCores: params.cpuCores,
      diskGb: params.diskGb,
    });
    const gabarit = resoudreGabaritJeuPourType(params.gameType);
    const fusionEnv = validerEtFusionnerVariablesEnvJeux({
      gabarit,
      variablesUtilisateur: params.variablesEnvBrutes,
      memoireMbInstance: params.memoryMb,
    });
    let nomPontDocker: string | undefined;
    const idReseauBrut = params.reseauInterneUtilisateurId?.trim();
    if (idReseauBrut !== undefined && idReseauBrut.length > 0) {
      const enregistrementReseau = await this.depotReseauInterne.trouverPourUtilisateur(
        idReseauBrut,
        params.utilisateurIdProprietaire,
      );
      if (enregistrementReseau === null) {
        throw new ErreurMetierInstanceJeux(
          "RESEAU_INTERNE_UTILISATEUR_INTROUVABLE",
          "Le réseau interne choisi est introuvable ou n’appartient pas à ce compte.",
          422,
        );
      }
      nomPontDocker = enregistrementReseau.nomDocker;
    }
    const dualKidopanelEtPont =
      idReseauBrut !== undefined &&
      idReseauBrut.length > 0 &&
      params.attacherReseauKidopanelComplement === true;
    const idInstance = randomUUID();
    const ligne = await this.depot.creer({
      id: idInstance,
      userId: params.utilisateurIdProprietaire,
      name: params.nomBrut.trim(),
      gameType: params.gameType,
      memoryMb: params.memoryMb,
      cpuCores: params.cpuCores,
      diskGb: params.diskGb,
      env: fusionEnv as unknown as Prisma.InputJsonValue,
      status: "INSTALLING",
      installLogs: null,
      ...(idReseauBrut !== undefined && idReseauBrut.length > 0
        ? {
            reseauInterneUtilisateurId: idReseauBrut,
            attacherReseauKidopanelComplement: dualKidopanelEtPont,
          }
        : {}),
    });

    return finaliserInstallationConteneurDockerInstanceJeux({
      depot: this.depot,
      depotPropriete: this.depotPropriete,
      clientMoteur: this.clientMoteur,
      ligne,
      gabarit,
      fusionEnv,
      identifiantRequeteHttp: params.identifiantRequeteHttp,
      ...(nomPontDocker === undefined ? {} : { reseauBridgeNom: nomPontDocker }),
      ...(dualKidopanelEtPont ? { reseauDualAvecKidopanel: true } : {}),
      ...(dualKidopanelEtPont && params.reseauPrimaireKidopanel === false
        ? { reseauPrimaireKidopanel: false }
        : {}),
    });
  }

  async redemarrer(params: {
    utilisateurId: string;
    role: RoleInterne;
    instanceId: string;
    identifiantRequeteHttp: string;
  }) {
    const ligne = await this.obtenirDetailPourIdentiteInterne({
      utilisateurId: params.utilisateurId,
      role: params.role,
      instanceId: params.instanceId,
    });
    if (params.role === "VIEWER") {
      throw new ErreurMetierInstanceJeux(
        "ROLE_LECTURE_SEULE_MUTATION_INTERDITE",
        "Le rôle observateur ne permet pas de redémarrer une instance.",
        403,
      );
    }
    const idDocker = ligne.containerId;
    if (!idDocker) {
      throw new ErreurMetierInstanceJeux(
        "MOTEUR_CONTENEURS_ERREUR",
        "Aucun conteneur Docker associé à cette instance.",
        409,
      );
    }
    await this.depot.mettreAJour(ligne.id, { status: "STOPPING" });
    const arret = await this.clientMoteur.posterArret(
      idDocker,
      params.identifiantRequeteHttp,
    );
    if (!arret.ok) {
      await this.depot.mettreAJour(ligne.id, { status: "ERROR" });
      throw new ErreurMetierInstanceJeux(
        "MOTEUR_CONTENEURS_ERREUR",
        "Impossible d’arrêter le conteneur avant redémarrage.",
        arret.status,
      );
    }
    await this.depot.mettreAJour(ligne.id, { status: "STARTING" });
    const dem = await this.clientMoteur.posterDemarrage(
      idDocker,
      params.identifiantRequeteHttp,
    );
    const texteDem = await dem.text();
    if (!dem.ok) {
      await this.depot.mettreAJour(ligne.id, {
        status: "ERROR",
        installLogs: texteDem.slice(0, 8000),
      });
      throw new ErreurMetierInstanceJeux(
        "MOTEUR_CONTENEURS_ERREUR",
        "Redémarrage : échec au démarrage.",
        dem.status,
      );
    }
    const ligneActive = await this.depot.mettreAJour(ligne.id, {
      status: "RUNNING",
      startedAt: new Date(),
    });
    return synchroniserPortInstanceApresDemarrageSurMoteur({
      depot: this.depot,
      clientMoteur: this.clientMoteur,
      ligne: ligneActive,
      identifiantRequeteHttp: params.identifiantRequeteHttp,
    });
  }

  async demarrer(params: {
    utilisateurId: string;
    role: RoleInterne;
    instanceId: string;
    identifiantRequeteHttp: string;
  }) {
    const ligne = await this.obtenirDetailPourIdentiteInterne({
      utilisateurId: params.utilisateurId,
      role: params.role,
      instanceId: params.instanceId,
    });
    if (params.role === "VIEWER") {
      throw new ErreurMetierInstanceJeux(
        "ROLE_LECTURE_SEULE_MUTATION_INTERDITE",
        "Le rôle observateur ne permet pas de démarrer une instance.",
        403,
      );
    }
    const idDocker = ligne.containerId;
    if (!idDocker) {
      throw new ErreurMetierInstanceJeux(
        "MOTEUR_CONTENEURS_ERREUR",
        "Aucun conteneur Docker associé à cette instance.",
        409,
      );
    }
    await this.depot.mettreAJour(ligne.id, { status: "STARTING" });
    const dem = await this.clientMoteur.posterDemarrage(
      idDocker,
      params.identifiantRequeteHttp,
    );
    const texteDem = await dem.text();
    if (!dem.ok) {
      await this.depot.mettreAJour(ligne.id, { status: "ERROR" });
      throw new ErreurMetierInstanceJeux(
        "MOTEUR_CONTENEURS_ERREUR",
        texteDem.slice(0, 200),
        dem.status,
      );
    }
    const ligneActive = await this.depot.mettreAJour(ligne.id, {
      status: "RUNNING",
      startedAt: new Date(),
    });
    return synchroniserPortInstanceApresDemarrageSurMoteur({
      depot: this.depot,
      clientMoteur: this.clientMoteur,
      ligne: ligneActive,
      identifiantRequeteHttp: params.identifiantRequeteHttp,
    });
  }

  async arreter(params: {
    utilisateurId: string;
    role: RoleInterne;
    instanceId: string;
    identifiantRequeteHttp: string;
  }) {
    const ligne = await this.obtenirDetailPourIdentiteInterne({
      utilisateurId: params.utilisateurId,
      role: params.role,
      instanceId: params.instanceId,
    });
    if (params.role === "VIEWER") {
      throw new ErreurMetierInstanceJeux(
        "ROLE_LECTURE_SEULE_MUTATION_INTERDITE",
        "Le rôle observateur ne permet pas d’arrêter une instance.",
        403,
      );
    }
    const idDocker = ligne.containerId;
    if (!idDocker) {
      await this.depot.mettreAJour(ligne.id, { status: "STOPPED" });
      return this.depot.trouverParId(ligne.id);
    }
    await this.depot.mettreAJour(ligne.id, { status: "STOPPING" });
    const arret = await this.clientMoteur.posterArret(
      idDocker,
      params.identifiantRequeteHttp,
    );
    if (!arret.ok) {
      await this.depot.mettreAJour(ligne.id, { status: "ERROR" });
      throw new ErreurMetierInstanceJeux(
        "MOTEUR_CONTENEURS_ERREUR",
        "Arrêt du conteneur refusé par le moteur.",
        arret.status,
      );
    }
    return this.depot.mettreAJour(ligne.id, {
      status: "STOPPED",
      stoppedAt: new Date(),
    });
  }

  async supprimer(params: {
    utilisateurId: string;
    role: RoleInterne;
    instanceId: string;
    identifiantRequeteHttp: string;
  }) {
    const ligne = await this.obtenirDetailPourIdentiteInterne({
      utilisateurId: params.utilisateurId,
      role: params.role,
      instanceId: params.instanceId,
    });
    if (params.role === "VIEWER") {
      throw new ErreurMetierInstanceJeux(
        "ROLE_LECTURE_SEULE_MUTATION_INTERDITE",
        "Le rôle observateur ne permet pas de supprimer une instance.",
        403,
      );
    }
    const idDocker = ligne.containerId;
    if (idDocker) {
      await this.clientMoteur.supprimerConteneur(
        idDocker,
        params.identifiantRequeteHttp,
      );
      await this.depotPropriete.retirerProprieteUtilisateurPourConteneur(
        ligne.userId,
        idDocker,
      );
    }
    await this.depot.supprimer(ligne.id);
  }
}
