import { randomUUID } from "node:crypto";
import type { GameType, PrismaClient } from "@kidopanel/database";
import {
  listerDepuisDepotPourIdentiteInterne,
  obtenirDetailDepuisDepotPourIdentiteInterne,
  Prisma,
  resoudreReseauInternePourCreationInstance,
} from "@kidopanel/database";
import type { DepotInstanceServeur } from "../repositories/depot-instance-serveur.repository.js";
import type { DepotProprieteConteneurInstance } from "../repositories/depot-propriete-conteneur-instance.repository.js";
import type { DepotReseauInterneUtilisateur } from "../repositories/depot-reseau-interne-utilisateur.repository.js";
import type { ClientMoteurConteneursHttp } from "./client-moteur-conteneurs-http.service.js";
import { resoudreGabaritJeuPourType } from "./mappage-gabarit-type-jeu.service.js";
import { validerEtFusionnerVariablesEnvJeux } from "./installateur-variables-env-jeu.service.js";
import { ErreurMetierInstanceJeux } from "../erreurs/erreurs-metier-instance-jeu.js";
import { finaliserInstallationConteneurDockerInstanceJeux } from "./finalisation-installation-docker-instance-jeu.service.js";
import { validerRessourcesAvantCreationInstanceJeu } from "./valider-ressources-instance-jeu.service.js";
import { CycleVieInstanceServeurPilotage } from "./cycle-vie-instance-serveur-pilotage.service.js";

type RoleInterne = "ADMIN" | "USER" | "VIEWER";

/**
 * Orchestre création Docker via le moteur HTTP et synchronise les statuts Prisma.
 */
export class CycleVieInstanceServeur {
  private readonly pilotage: CycleVieInstanceServeurPilotage;

  constructor(
    private readonly db: PrismaClient,
    private readonly depot: DepotInstanceServeur,
    private readonly depotPropriete: DepotProprieteConteneurInstance,
    private readonly clientMoteur: ClientMoteurConteneursHttp,
    private readonly depotReseauInterne: DepotReseauInterneUtilisateur,
  ) {
    this.pilotage = new CycleVieInstanceServeurPilotage(
      (params) => this.obtenirDetailPourIdentiteInterne(params),
      this.depot,
      this.depotPropriete,
      this.clientMoteur,
    );
  }

  async listerPourIdentiteInterne(params: {
    utilisateurId: string;
    role: RoleInterne;
  }) {
    return listerDepuisDepotPourIdentiteInterne(this.depot, params);
  }

  async obtenirDetailPourIdentiteInterne(params: {
    utilisateurId: string;
    role: RoleInterne;
    instanceId: string;
  }) {
    return obtenirDetailDepuisDepotPourIdentiteInterne(this.depot, params, {
      leverSiIntrouvable: () =>
        new ErreurMetierInstanceJeux(
          "INSTANCE_JEU_NON_TROUVEE",
          "Instance introuvable.",
          404,
        ),
      leverSiAccesRefuse: () =>
        new ErreurMetierInstanceJeux(
          "INSTANCE_JEU_ACCES_REFUSE",
          "Accès à cette instance refusé.",
          403,
        ),
    });
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
    if (params.role !== "ADMIN") {
      await validerRessourcesAvantCreationInstanceJeu({
        db: this.db,
        userId: params.utilisateurIdProprietaire,
        memoryMb: params.memoryMb,
        cpuCores: params.cpuCores,
        diskGb: params.diskGb,
      });
    }
    const gabarit = resoudreGabaritJeuPourType(params.gameType);
    const fusionEnv = validerEtFusionnerVariablesEnvJeux({
      gabarit,
      variablesUtilisateur: params.variablesEnvBrutes,
      memoireMbInstance: params.memoryMb,
    });
    const resolutionReseau = await resoudreReseauInternePourCreationInstance({
      identifiantReseauInterneBrut: params.reseauInterneUtilisateurId,
      utilisateurIdProprietaire: params.utilisateurIdProprietaire,
      trouverPourUtilisateur: (idReseau, utilisateurId) =>
        this.depotReseauInterne.trouverPourUtilisateur(idReseau, utilisateurId),
      leverSiReseauIntrouvable: () =>
        new ErreurMetierInstanceJeux(
          "RESEAU_INTERNE_UTILISATEUR_INTROUVABLE",
          "Le réseau interne choisi est introuvable ou n’appartient pas à ce compte.",
          422,
        ),
    });
    let nomPontDocker: string | undefined;
    let idReseauBrut: string | undefined;
    if (resolutionReseau.mode === "avec_reseau") {
      nomPontDocker = resolutionReseau.nomPontDocker;
      idReseauBrut = resolutionReseau.idReseau;
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
    return this.pilotage.redemarrer(params);
  }

  async demarrer(params: {
    utilisateurId: string;
    role: RoleInterne;
    instanceId: string;
    identifiantRequeteHttp: string;
  }) {
    return this.pilotage.demarrer(params);
  }

  async arreter(params: {
    utilisateurId: string;
    role: RoleInterne;
    instanceId: string;
    identifiantRequeteHttp: string;
  }) {
    return this.pilotage.arreter(params);
  }

  async supprimer(params: {
    utilisateurId: string;
    role: RoleInterne;
    instanceId: string;
    identifiantRequeteHttp: string;
  }) {
    return this.pilotage.supprimer(params);
  }
}
