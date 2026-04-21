import type { ExecConteneurCorps } from "./exec-conteneur-corps.schema.js";

const EN_TETE_CORRELATION = "X-Request-Id";

export type CorpsCreationConteneurMoteurPartage = Record<string, unknown>;

/** Client HTTP partagé vers container-engine pour les opérations conteneur standards. */
export class ClientMoteurHttpPartage {
  constructor(private readonly urlBaseMoteur: string) {}

  protected construireUrl(chemin: string): string {
    const base = this.urlBaseMoteur.replace(/\/+$/, "");
    const suffixe = chemin.startsWith("/") ? chemin : `/${chemin}`;
    return `${base}${suffixe}`;
  }

  async posterCreation(
    corps: CorpsCreationConteneurMoteurPartage,
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

  async obtenirListeConteneurs(identifiantRequete: string): Promise<Response> {
    const url = new URL(this.construireUrl("/containers"));
    url.searchParams.set("all", "true");
    return fetch(url.toString(), {
      method: "GET",
      headers: {
        [EN_TETE_CORRELATION]: identifiantRequete,
      },
    });
  }

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

  /**
   * Exécute une commande ponctuelle dans le conteneur via le moteur (`POST /containers/:id/exec`).
   */
  async posterExecDansConteneur(
    idConteneurDocker: string,
    corps: ExecConteneurCorps,
    identifiantRequete: string,
  ): Promise<Response> {
    return fetch(
      this.construireUrl(`/containers/${encodeURIComponent(idConteneurDocker)}/exec`),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [EN_TETE_CORRELATION]: identifiantRequete,
        },
        body: JSON.stringify(corps),
      },
    );
  }

  /** Liste un répertoire dans le conteneur (`GET …/fs/list`). */
  async obtenirListeFsConteneur(params: {
    idConteneurDocker: string;
    cheminAbsolu: string;
    identifiantRequete: string;
  }): Promise<Response> {
    const url = new URL(
      this.construireUrl(
        `/containers/${encodeURIComponent(params.idConteneurDocker)}/fs/list`,
      ),
    );
    url.searchParams.set("path", params.cheminAbsolu);
    return fetch(url.toString(), {
      method: "GET",
      headers: {
        [EN_TETE_CORRELATION]: params.identifiantRequete,
      },
    });
  }

  /** Lit un fichier texte dans le conteneur (`GET …/fs/content`). */
  async obtenirContenuFichierFsConteneur(params: {
    idConteneurDocker: string;
    cheminAbsolu: string;
    identifiantRequete: string;
  }): Promise<Response> {
    const url = new URL(
      this.construireUrl(
        `/containers/${encodeURIComponent(params.idConteneurDocker)}/fs/content`,
      ),
    );
    url.searchParams.set("path", params.cheminAbsolu);
    return fetch(url.toString(), {
      method: "GET",
      headers: {
        [EN_TETE_CORRELATION]: params.identifiantRequete,
      },
    });
  }

  /** Écrit un fichier texte dans le conteneur (`PUT …/fs/content`). */
  async ecrireFichierFsConteneur(params: {
    idConteneurDocker: string;
    cheminAbsolu: string;
    contenuUtf8: string;
    identifiantRequete: string;
  }): Promise<Response> {
    const url = new URL(
      this.construireUrl(
        `/containers/${encodeURIComponent(params.idConteneurDocker)}/fs/content`,
      ),
    );
    url.searchParams.set("path", params.cheminAbsolu);
    return fetch(url.toString(), {
      method: "PUT",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        [EN_TETE_CORRELATION]: params.identifiantRequete,
      },
      body: params.contenuUtf8,
    });
  }

  /** Supprime un fichier ou répertoire vide dans le conteneur (`DELETE …/fs`). */
  async supprimerCheminFsConteneur(params: {
    idConteneurDocker: string;
    cheminAbsolu: string;
    identifiantRequete: string;
  }): Promise<Response> {
    const url = new URL(
      this.construireUrl(`/containers/${encodeURIComponent(params.idConteneurDocker)}/fs`),
    );
    url.searchParams.set("path", params.cheminAbsolu);
    return fetch(url.toString(), {
      method: "DELETE",
      headers: {
        [EN_TETE_CORRELATION]: params.identifiantRequete,
      },
    });
  }
}
