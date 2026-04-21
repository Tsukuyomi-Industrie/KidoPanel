import type { GameServerInstance } from "@kidopanel/database";
import type { DepotInstanceServeur } from "../repositories/depot-instance-serveur.repository.js";
import type { DepotProprieteConteneurInstance } from "../repositories/depot-propriete-conteneur-instance.repository.js";
import type { ClientMoteurConteneursHttp } from "./client-moteur-conteneurs-http.service.js";
import { ErreurMetierInstanceJeux } from "../erreurs/erreurs-metier-instance-jeu.js";
import { synchroniserPortInstanceApresDemarrageSurMoteur } from "./synchroniser-port-instance-apres-demarrage-moteur.service.js";

type RoleInterne = "ADMIN" | "USER" | "VIEWER";

type ParamsDetailIdentiteServeurJeux = {
  utilisateurId: string;
  role: RoleInterne;
  instanceId: string;
};

/**
 * Démarrage, arrêt, redémarrage et suppression d’instances jeu après contrôle d’accès et appels moteur.
 */
export class CycleVieInstanceServeurPilotage {
  constructor(
    private readonly obtenirDetailPourIdentiteInterne: (
      params: ParamsDetailIdentiteServeurJeux,
    ) => Promise<GameServerInstance>,
    private readonly depot: DepotInstanceServeur,
    private readonly depotPropriete: DepotProprieteConteneurInstance,
    private readonly clientMoteur: ClientMoteurConteneursHttp,
  ) {}

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
