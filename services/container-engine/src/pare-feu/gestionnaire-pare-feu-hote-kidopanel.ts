import type { DockerClient } from "../docker-connection.js";
import { journaliserMoteur } from "../observabilite/journal-json.js";
import { extrairePublicationsHoteNonLoopbackDepuisInspection } from "./extraire-publications-hote-depuis-inspection-docker.js";
import {
  fermerPortFirewalldHote,
  ouvrirPortFirewalldHote,
  testerFirewalldActifSurHote,
} from "./executer-firewalld-hote.js";
import {
  RepositoryEtatPareFeuHoteKidopanel,
  resoudreCheminFichierEtatPareFeuDepuisEnv,
} from "./repository-etat-pare-feu-hote-kidopanel.js";
import type { PublicationHotePareFeu } from "./types-publication-hote-pare-feu.js";

function clePublication(p: PublicationHotePareFeu): string {
  return `${p.protocole}:${String(p.numero)}`;
}

function pareFeuAutomatiqueActiveDepuisEnv(): boolean {
  return process.env.CONTAINER_ENGINE_PAREFEU_AUTO?.trim() !== "0";
}

/**
 * Orchestre l’ouverture et la fermeture des ports sur firewalld pour les publications Docker réelles,
 * avec persistance pour la désinstallation globale du panel.
 */
export class GestionnairePareFeuHoteKidopanel {
  /** Évite de spammer les journaux si le test firewalld échoue au premier démarrage. */
  private journalEtatPareFeuDejaEmis = false;

  constructor(private readonly depot: RepositoryEtatPareFeuHoteKidopanel) {}

  /** Instance par défaut : état JSON sous `donnees/` ou chemin imposé par l’environnement. */
  static creerDepuisEnv(): GestionnairePareFeuHoteKidopanel {
    return new GestionnairePareFeuHoteKidopanel(
      new RepositoryEtatPareFeuHoteKidopanel(resoudreCheminFichierEtatPareFeuDepuisEnv()),
    );
  }

  /**
   * Journalise une fois si `firewall-cmd --state` échoue ; n’empêche pas les tentatives d’ouverture
   * (le blocage « tout ou rien » avec sudo sans NOPASSWD était la cause principale des échecs silencieux).
   */
  private async journaliserEtatFirewalldSiBesoin(requestId?: string): Promise<void> {
    if (this.journalEtatPareFeuDejaEmis) {
      return;
    }
    const actif = await testerFirewalldActifSurHote();
    if (actif) {
      return;
    }
    this.journalEtatPareFeuDejaEmis = true;
    journaliserMoteur({
      niveau: "warn",
      message: "pare_feu_hote_test_etat_firewall_cmd_echoue",
      requestId,
      metadata: {
        uidEffectif:
          typeof process.geteuid === "function" ? process.geteuid() : undefined,
        pareFeuSansSudo: process.env.CONTAINER_ENGINE_PAREFEU_SANS_SUDO,
        note: "Les ouvertures seront tout de même tentées. Sans droits root et sans « sudo NOPASSWD » pour /usr/bin/firewall-cmd, utilisez une règle sudoers ou PAREFEU_SANS_SUDO=1 si le moteur tourne en root.",
      },
    });
  }

  /**
   * Après démarrage Docker : ouvre les ports hôte publiés (hors loopback) et met à jour le fichier d’état.
   */
  async apresDemarrageConteneur(
    idConteneur: string,
    docker: DockerClient,
    options?: { requestId?: string },
  ): Promise<void> {
    if (!pareFeuAutomatiqueActiveDepuisEnv()) {
      return;
    }
    await this.journaliserEtatFirewalldSiBesoin(options?.requestId);

    let inspection;
    try {
      inspection = await docker.getContainer(idConteneur).inspect();
    } catch {
      return;
    }

    const publications = extrairePublicationsHoteNonLoopbackDepuisInspection(inspection);
    const idCanonique = inspection.Id;

    if (publications.length > 0) {
      journaliserMoteur({
        niveau: "info",
        message: "pare_feu_hote_publications_detectees",
        requestId: options?.requestId,
        metadata: {
          idConteneurDocker: idCanonique,
          ports: publications.map((p) => `${String(p.numero)}/${p.protocole}`),
        },
      });
    }

    const existante = await this.depot.trouverEntreePourIdConteneur(idCanonique);
    const anciennesList = existante?.entree.ports ?? [];

    const cleAnc = new Set(anciennesList.map(clePublication));
    const cleNouv = new Set(publications.map(clePublication));

    for (const ancienne of anciennesList) {
      if (!cleNouv.has(clePublication(ancienne))) {
        const res = await fermerPortFirewalldHote(ancienne);
        if (!res.ok) {
          journaliserMoteur({
            niveau: "warn",
            message: "pare_feu_hote_fermeture_port_echec",
            requestId: options?.requestId,
            metadata: {
              port: ancienne.numero,
              protocole: ancienne.protocole,
              erreur: res.messageErreur,
            },
          });
        }
      }
    }

    for (const pub of publications) {
      if (!cleAnc.has(clePublication(pub))) {
        const res = await ouvrirPortFirewalldHote(pub);
        if (!res.ok) {
          journaliserMoteur({
            niveau: "warn",
            message: "pare_feu_hote_ouverture_port_echec",
            requestId: options?.requestId,
            metadata: {
              port: pub.numero,
              protocole: pub.protocole,
              erreur: res.messageErreur,
            },
          });
        } else {
          journaliserMoteur({
            niveau: "info",
            message: "pare_feu_hote_port_ouvert",
            requestId: options?.requestId,
            metadata: {
              idConteneurDocker: idCanonique,
              port: pub.numero,
              protocole: pub.protocole,
            },
          });
        }
      }
    }

    if (publications.length > 0) {
      await this.depot.remplacerEntreeConteneur(idCanonique, publications);
    } else {
      await this.depot.retirerEntreePourIdConteneur(idCanonique);
    }
  }

  /**
   * Avant suppression du conteneur : retire les règles pare-feu enregistrées pour cet identifiant.
   */
  async avantSuppressionConteneur(
    idConteneur: string,
    options?: { requestId?: string },
  ): Promise<void> {
    if (!pareFeuAutomatiqueActiveDepuisEnv()) {
      return;
    }

    const ports = await this.depot.retirerEntreePourIdConteneur(idConteneur);
    for (const pub of ports) {
      const res = await fermerPortFirewalldHote(pub);
      if (!res.ok) {
        journaliserMoteur({
          niveau: "warn",
          message: "pare_feu_hote_fermeture_port_echec",
          requestId: options?.requestId,
          metadata: {
            port: pub.numero,
            protocole: pub.protocole,
            erreur: res.messageErreur,
          },
        });
      }
    }
  }
}

/**
 * Fabrique un gestionnaire si la variable d’environnement n’a pas désactivé la fonctionnalité.
 */
export function creerGestionnairePareFeuHoteKidopanelDepuisEnv():
  | GestionnairePareFeuHoteKidopanel
  | undefined {
  if (!pareFeuAutomatiqueActiveDepuisEnv()) {
    return undefined;
  }
  return GestionnairePareFeuHoteKidopanel.creerDepuisEnv();
}
