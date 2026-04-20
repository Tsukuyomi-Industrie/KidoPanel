import type { DockerClient } from "../docker-connection.js";
import { journaliserMoteur } from "../observabilite/journal-json.js";
import { collecterPublicationsHoteApresDemarrageDocker } from "./collecter-publications-hote-apres-demarrage-docker.js";
import {
  fermerPortPareFeuHoteUnifie,
  ouvrirPortPareFeuHoteUnifie,
  rechargerRuntimeFirewalldApresModifications,
} from "./executer-pare-feu-unifie-hote.js";
import {
  RepositoryEtatPareFeuHoteKidopanel,
  resoudreCheminFichierEtatPareFeuDepuisEnv,
} from "./repository-etat-pare-feu-hote-kidopanel.js";
import { obtenirMessageDiagnosticAucunBackendPareFeuActif } from "./diagnostic-backend-pare-feu-inactif.js";
import { obtenirBackendPareFeuHote } from "./selection-backend-pare-feu-hote.js";
import type { PublicationHotePareFeu } from "./types-publication-hote-pare-feu.js";

function clePublication(p: PublicationHotePareFeu): string {
  return `${p.protocole}:${String(p.numero)}`;
}

function pareFeuAutomatiqueActiveDepuisEnv(): boolean {
  return process.env.CONTAINER_ENGINE_PAREFEU_AUTO?.trim() !== "0";
}

/**
 * Orchestre l’ouverture et la fermeture des ports sur le pare-feu hôte (firewalld ou UFW selon détection),
 * avec persistance pour la désinstallation globale du panel.
 */
export class GestionnairePareFeuHoteKidopanel {
  private journalBackendPareFeuDejaEmis = false;

  constructor(private readonly depot: RepositoryEtatPareFeuHoteKidopanel) {}

  /** Instance par défaut : état JSON sous `donnees/` ou chemin imposé par l’environnement. */
  static creerDepuisEnv(): GestionnairePareFeuHoteKidopanel {
    return new GestionnairePareFeuHoteKidopanel(
      new RepositoryEtatPareFeuHoteKidopanel(resoudreCheminFichierEtatPareFeuDepuisEnv()),
    );
  }

  /** Journalise une fois le backend choisi (auto, firewalld ou ufw). */
  private async journaliserBackendPareFeuUneFois(requestId?: string): Promise<void> {
    if (this.journalBackendPareFeuDejaEmis) {
      return;
    }
    this.journalBackendPareFeuDejaEmis = true;
    const backend = await obtenirBackendPareFeuHote();
    const diagnosticSansBackendActif =
      backend === null ? await obtenirMessageDiagnosticAucunBackendPareFeuActif() : undefined;
    journaliserMoteur({
      niveau: backend === null ? "warn" : "info",
      message:
        backend === null
          ? "pare_feu_hote_aucun_backend_firewalld_ni_ufw"
          : "pare_feu_hote_backend_pare_feu_selectionne",
      requestId,
      metadata: {
        backend: backend ?? "aucun",
        conteneurEnginePareFeuBackend:
          process.env.CONTAINER_ENGINE_PAREFEU_BACKEND ?? "(auto)",
        uidEffectif:
          typeof process.geteuid === "function" ? process.geteuid() : undefined,
        ...(diagnosticSansBackendActif === undefined
          ? {}
          : { diagnosticSansBackendActif }),
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
    if (pareFeuAutomatiqueActiveDepuisEnv() === false) {
      return;
    }
    await this.journaliserBackendPareFeuUneFois(options?.requestId);

    let publications: PublicationHotePareFeu[];
    let idCanonique: string;
    try {
      const recolte = await collecterPublicationsHoteApresDemarrageDocker(
        docker,
        idConteneur,
      );
      publications = recolte.publications;
      idCanonique = recolte.idCanonique;
    } catch {
      return;
    }

    if (publications.length === 0) {
      journaliserMoteur({
        niveau: "info",
        message: "pare_feu_hote_sans_publication_hote_a_ouvrir",
        requestId: options?.requestId,
        metadata: {
          idConteneurDocker: idCanonique,
          note: "Normal si le conteneur ne publie aucun port sur l’hôte.",
        },
      });
    }

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

    let firewalldModifie = false;

    for (const ancienne of anciennesList) {
      if (cleNouv.has(clePublication(ancienne)) === false) {
        const res = await fermerPortPareFeuHoteUnifie(ancienne);
        if (res.ok && res.backend === "firewalld") {
          firewalldModifie = true;
        }
        if (res.ok === false) {
          journaliserMoteur({
            niveau: "warn",
            message: "pare_feu_hote_fermeture_port_echec",
            requestId: options?.requestId,
            metadata: {
              port: ancienne.numero,
              protocole: ancienne.protocole,
              erreur: res.messageErreur,
              backend: res.backend,
            },
          });
        }
      }
    }

    for (const pub of publications) {
      if (cleAnc.has(clePublication(pub)) === false) {
        const res = await ouvrirPortPareFeuHoteUnifie(pub);
        if (res.ok && res.backend === "firewalld") {
          firewalldModifie = true;
        }
        if (res.ok === false) {
          journaliserMoteur({
            niveau: "warn",
            message: "pare_feu_hote_ouverture_port_echec",
            requestId: options?.requestId,
            metadata: {
              port: pub.numero,
              protocole: pub.protocole,
              erreur: res.messageErreur,
              backend: res.backend,
              conseil:
                "Vérifiez que le processus moteur a accès à sudo NOPASSWD pour firewall-cmd ou ufw. Voir .env.example (CONTAINER_ENGINE_PAREFEU_BACKEND).",
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
              backend: res.backend,
            },
          });
        }
      }
    }

    if (firewalldModifie) {
      await rechargerRuntimeFirewalldApresModifications();
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
    if (pareFeuAutomatiqueActiveDepuisEnv() === false) {
      return;
    }

    let firewalldModifie = false;
    const ports = await this.depot.retirerEntreePourIdConteneur(idConteneur);
    for (const pub of ports) {
      const res = await fermerPortPareFeuHoteUnifie(pub);
      if (res.ok && res.backend === "firewalld") {
        firewalldModifie = true;
      }
      if (!res.ok) {
        journaliserMoteur({
          niveau: "warn",
          message: "pare_feu_hote_fermeture_port_echec",
          requestId: options?.requestId,
          metadata: {
            port: pub.numero,
            protocole: pub.protocole,
            erreur: res.messageErreur,
            backend: res.backend,
          },
        });
      }
    }
    if (firewalldModifie) {
      await rechargerRuntimeFirewalldApresModifications();
    }
  }
}

/**
 * Fabrique un gestionnaire si la variable d’environnement n’a pas désactivé la fonctionnalité.
 */
export function creerGestionnairePareFeuHoteKidopanelDepuisEnv():
  | GestionnairePareFeuHoteKidopanel
  | undefined {
  if (pareFeuAutomatiqueActiveDepuisEnv() === false) {
    return undefined;
  }
  return GestionnairePareFeuHoteKidopanel.creerDepuisEnv();
}
