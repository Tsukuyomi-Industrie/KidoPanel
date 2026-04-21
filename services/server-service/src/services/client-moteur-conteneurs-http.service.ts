import type { GabaritJeuCatalogueInstance } from "@kidopanel/container-catalog";
import {
  ClientMoteurHttpPartage,
  type CorpsCreationConteneurMoteurPartage,
} from "@kidopanel/database";

export type CorpsCreationConteneurMoteur = CorpsCreationConteneurMoteurPartage;

/**
 * Client HTTP vers le container-engine : aucune dépendance dockerode ici.
 */
export class ClientMoteurConteneursHttp extends ClientMoteurHttpPartage {
  private protocoleReseauParDefautPourGabarit(
    gabarit: GabaritJeuCatalogueInstance,
  ): "tcp" | "udp" {
    if (
      gabarit.id === "tmpl-jeu-minecraft-bedrock" ||
      gabarit.id === "tmpl-jeu-valheim"
    ) {
      return "udp";
    }
    return "tcp";
  }

  /** Compose le corps JSON `POST /containers` à partir de l’instance persistée et du gabarit jeu. */
  construireCorpsCreationDocker(params: {
    nomConteneur: string;
    gabarit: GabaritJeuCatalogueInstance;
    memoireMb: number;
    coeursCpu: number;
    variablesEnv: Record<string, string>;
    /** Nom Docker du pont utilisateur (`kidopanel-unet-…`) lorsque l’instance n’utilise pas uniquement `kidopanel-network`. */
    reseauBridgeNom?: string;
    reseauDualAvecKidopanel?: boolean;
    reseauPrimaireKidopanel?: boolean;
  }): CorpsCreationConteneurMoteur {
    const protocolePortsJeu = this.protocoleReseauParDefautPourGabarit(
      params.gabarit,
    );
    const liaisonsPorts: Record<string, Array<{ hostIp: string; hostPort: string }>> =
      {};
    const portsExposes: string[] = [];
    for (const port of params.gabarit.defaultPorts) {
      const cle = `${String(port)}/${protocolePortsJeu}`;
      portsExposes.push(cle);
      liaisonsPorts[cle] = [{ hostIp: "0.0.0.0", hostPort: "0" }];
    }
    const corps: CorpsCreationConteneurMoteur = {
      name: params.nomConteneur,
      imageCatalogId: params.gabarit.imageCatalogId,
      exposedPorts: portsExposes,
      env: params.variablesEnv,
      hostConfig: {
        memoryBytes: params.memoireMb * 1024 * 1024,
        nanoCpus: Math.round(params.coeursCpu * 1e9),
        portBindings: liaisonsPorts,
        restartPolicy: { name: "unless-stopped" },
      },
    };
    const pont = params.reseauBridgeNom?.trim();
    if (pont !== undefined && pont.length > 0) {
      corps.reseauBridgeNom = pont;
    }
    if (params.reseauDualAvecKidopanel === true) {
      corps.reseauDualAvecKidopanel = true;
    }
    if (params.reseauPrimaireKidopanel === false) {
      corps.reseauPrimaireKidopanel = false;
    }
    return corps;
  }

  /**
   * Liste les conteneurs Docker via le moteur (`GET /containers`) pour diagnostic ou lecture des publications de ports.
   */
  async listerConteneursDiagnostic(params: {
    inclureArretes: boolean;
    identifiantRequete: string;
  }): Promise<Response> {
    if (params.inclureArretes) {
      return this.obtenirListeConteneurs(params.identifiantRequete);
    }
    const url = new URL(this.construireUrl("/containers"));
    return fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-Request-Id": params.identifiantRequete,
      },
    });
  }
}
