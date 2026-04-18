import type { GabaritJeuCatalogueInstance } from "@kidopanel/container-catalog";

const EN_TETE_CORRELATION = "X-Request-Id";

export type CorpsCreationConteneurMoteur = Record<string, unknown>;

/**
 * Client HTTP vers le container-engine : aucune dépendance dockerode ici.
 */
export class ClientMoteurConteneursHttp {
  constructor(private readonly urlBaseMoteur: string) {}

  private construireUrl(chemin: string): string {
    const base = this.urlBaseMoteur.replace(/\/+$/, "");
    const suffixe = chemin.startsWith("/") ? chemin : `/${chemin}`;
    return `${base}${suffixe}`;
  }

  /** Compose le corps JSON `POST /containers` à partir de l’instance persistée et du gabarit jeu. */
  construireCorpsCreationDocker(params: {
    nomConteneur: string;
    gabarit: GabaritJeuCatalogueInstance;
    memoireMb: number;
    coeursCpu: number;
    variablesEnv: Record<string, string>;
  }): CorpsCreationConteneurMoteur {
    const liaisonsPorts: Record<string, Array<{ hostIp: string; hostPort: string }>> =
      {};
    const portsExposes: string[] = [];
    for (const port of params.gabarit.defaultPorts) {
      const cle = `${String(port)}/tcp`;
      portsExposes.push(cle);
      liaisonsPorts[cle] = [{ hostIp: "", hostPort: "0" }];
    }
    return {
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
  }

  async posterCreation(
    corps: CorpsCreationConteneurMoteur,
    identifiantRequete: string,
  ): Promise<Response> {
    return fetch(this.construireUrl("/containers"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [EN_TETE_CORRELATION]: identifiantRequete,
      },
      body: JSON.stringify(corps),
    });
  }

  async posterDemarrage(
    idConteneurDocker: string,
    identifiantRequete: string,
  ): Promise<Response> {
    return fetch(this.construireUrl(`/containers/${encodeURIComponent(idConteneurDocker)}/start`), {
      method: "POST",
      headers: {
        [EN_TETE_CORRELATION]: identifiantRequete,
      },
    });
  }

  async posterArret(
    idConteneurDocker: string,
    identifiantRequete: string,
  ): Promise<Response> {
    return fetch(this.construireUrl(`/containers/${encodeURIComponent(idConteneurDocker)}/stop`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [EN_TETE_CORRELATION]: identifiantRequete,
      },
      body: JSON.stringify({}),
    });
  }

  async supprimerConteneur(
    idConteneurDocker: string,
    identifiantRequete: string,
  ): Promise<Response> {
    const url = new URL(
      this.construireUrl(`/containers/${encodeURIComponent(idConteneurDocker)}`),
    );
    url.searchParams.set("force", "true");
    return fetch(url.toString(), {
      method: "DELETE",
      headers: {
        [EN_TETE_CORRELATION]: identifiantRequete,
      },
    });
  }

  /**
   * Relaie le flux SSE Docker `logs/stream` sans consommer le corps : la réponse est renvoyée au client HTTP.
   */
  async relayerFluxJournauxConteneurVersMoteur(params: {
    idConteneurDocker: string;
    parametresRequete: URLSearchParams;
    identifiantRequete: string;
    signalAnnulation: AbortSignal;
  }): Promise<Response> {
    const url = new URL(
      this.construireUrl(
        `/containers/${encodeURIComponent(params.idConteneurDocker)}/logs/stream`,
      ),
    );
    params.parametresRequete.forEach((valeur, cle) => {
      url.searchParams.set(cle, valeur);
    });
    return fetch(url.toString(), {
      method: "GET",
      headers: {
        [EN_TETE_CORRELATION]: params.identifiantRequete,
        Accept: "text/event-stream",
      },
      signal: params.signalAnnulation,
    });
  }
}
