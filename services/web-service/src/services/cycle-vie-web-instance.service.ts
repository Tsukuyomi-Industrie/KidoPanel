import { randomUUID } from "node:crypto";
import {
  listerDepuisDepotPourIdentiteInterne,
  obtenirDetailDepuisDepotPourIdentiteInterne,
  Prisma,
  resoudreReseauInternePourCreationInstance,
  type PrismaClient,
  type WebStack,
} from "@kidopanel/database";
import type { DepotWebInstance } from "../repositories/depot-web-instance.repository.js";
import type { DepotProprieteConteneur } from "../repositories/depot-propriete-conteneur.repository.js";
import type { DepotDomaineProxy } from "../repositories/depot-domaine-proxy.repository.js";
import type { DepotReseauInterneUtilisateur } from "../repositories/depot-reseau-interne-utilisateur.repository.js";
import type { ClientMoteurWebHttp } from "./client-moteur-web.service.js";
import {
  construireCorpsCreationMoteurPourInstanceWeb,
  portInterneDefautPourStack,
} from "./mappage-stack-web-vers-corps-moteur.service.js";
import { validerQuotasPourNouvelleInstanceWeb } from "./valider-quotas-utilisateur-web.service.js";
import { finaliserInstallationConteneurWeb } from "./finalisation-installation-web-instance.service.js";
import type { ProxyManagerService } from "./proxy-manager.service.js";
import { ErreurMetierWebInstance } from "../erreurs/erreurs-metier-web-instance.js";
import { CycleVieWebInstancePilotage } from "./cycle-vie-web-instance-pilotage.service.js";

type RoleInterne = "ADMIN" | "USER" | "VIEWER";

/**
 * Cycle de vie des instances web : persistance Prisma et appels au moteur HTTP Docker.
 */
export class CycleVieWebInstance {
  private readonly pilotage: CycleVieWebInstancePilotage;

  constructor(
    private readonly db: PrismaClient,
    private readonly depot: DepotWebInstance,
    private readonly depotPropriete: DepotProprieteConteneur,
    private readonly depotDomaine: DepotDomaineProxy,
    private readonly depotReseau: DepotReseauInterneUtilisateur,
    private readonly clientMoteur: ClientMoteurWebHttp,
    private readonly proxyManager: ProxyManagerService,
  ) {
    this.pilotage = new CycleVieWebInstancePilotage(
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
        new ErreurMetierWebInstance(
          "INSTANCE_WEB_NON_TROUVEE",
          "Instance introuvable.",
          404,
        ),
      leverSiAccesRefuse: () =>
        new ErreurMetierWebInstance(
          "INSTANCE_WEB_ACCES_REFUSE",
          "Accès à cette instance refusé.",
          403,
        ),
    });
  }

  async creerEtOrchestrerInstallation(params: {
    utilisateurIdProprietaire: string;
    role: RoleInterne;
    name: string;
    techStack: WebStack;
    memoryMb: number;
    diskGb: number;
    env: Record<string, string>;
    portHote?: number;
    domaineInitial?: string;
    gabaritDockerRapideId?: string;
    reseauInterneUtilisateurId?: string;
    identifiantRequeteHttp: string;
  }) {
    if (params.role === "VIEWER") {
      throw new ErreurMetierWebInstance(
        "ROLE_LECTURE_SEULE_MUTATION_INTERDITE",
        "Le rôle observateur ne permet pas de créer une instance web.",
        403,
      );
    }
    if (params.role !== "ADMIN") {
      await validerQuotasPourNouvelleInstanceWeb(
        this.db,
        params.utilisateurIdProprietaire,
        params.memoryMb,
        params.diskGb,
      );
    }
    const resolutionReseau = await resoudreReseauInternePourCreationInstance({
      identifiantReseauInterneBrut: params.reseauInterneUtilisateurId,
      utilisateurIdProprietaire: params.utilisateurIdProprietaire,
      trouverPourUtilisateur: (idReseau, utilisateurId) =>
        this.depotReseau.trouverPourUtilisateur(idReseau, utilisateurId),
      leverSiReseauIntrouvable: () =>
        new ErreurMetierWebInstance(
          "RESEAU_INTERNE_UTILISATEUR_INTROUVABLE",
          "Réseau interne introuvable ou non associé à ce compte.",
          422,
        ),
    });
    let nomPontDocker: string | undefined;
    let idReseauBrut: string | undefined;
    if (resolutionReseau.mode === "avec_reseau") {
      nomPontDocker = resolutionReseau.nomPontDocker;
      idReseauBrut = resolutionReseau.idReseau;
    }
    const idInstance = randomUUID();
    const envJson = params.env as unknown as Prisma.InputJsonValue;
    const ligne = await this.depot.creer({
      id: idInstance,
      userId: params.utilisateurIdProprietaire,
      name: params.name.trim(),
      techStack: params.techStack,
      memoryMb: params.memoryMb,
      diskGb: params.diskGb,
      env: envJson,
      status: "INSTALLING",
      ...(idReseauBrut !== undefined && idReseauBrut.length > 0
        ? { reseauInterneUtilisateurId: idReseauBrut }
        : {}),
    });

    const nomDocker = `kpweb-${ligne.id.replaceAll("-", "").slice(0, 22)}`;
    const corpsDocker = construireCorpsCreationMoteurPourInstanceWeb({
      nomConteneurDocker: nomDocker,
      memoryMb: params.memoryMb,
      env: params.env,
      techStack: params.techStack,
      gabaritDockerRapideId: params.gabaritDockerRapideId,
      portPublicationHote: params.portHote,
      ...(nomPontDocker === undefined ? {} : { reseauBridgeNom: nomPontDocker }),
    });

    const { instance, ipReseauInterne } = await finaliserInstallationConteneurWeb({
      depot: this.depot,
      depotPropriete: this.depotPropriete,
      clientMoteur: this.clientMoteur,
      ligne,
      corpsDocker,
      identifiantRequeteHttp: params.identifiantRequeteHttp,
    });

    const domaineBrut = params.domaineInitial?.trim();
    let instanceFinale = instance;
    if (
      domaineBrut === undefined ||
      domaineBrut.length === 0 ||
      ipReseauInterne === undefined
    ) {
      return instanceFinale;
    }
    await this.depotDomaine.creer({
      id: randomUUID(),
      userId: params.utilisateurIdProprietaire,
      webInstanceId: instance.id,
      domaine: domaineBrut.toLowerCase(),
      cibleInterne: ipReseauInterne,
      portCible: portInterneDefautPourStack(params.techStack),
    });
    instanceFinale = await this.depot.mettreAJour(instance.id, {
      domain: domaineBrut.toLowerCase(),
    });
    try {
      await this.proxyManager.rechargerConfigurationProxy(
        undefined,
        params.identifiantRequeteHttp,
      );
    } catch {
      /* La configuration proxy reste cohérente en base même si le conteneur proxy est absent. */
    }

    return instanceFinale;
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
