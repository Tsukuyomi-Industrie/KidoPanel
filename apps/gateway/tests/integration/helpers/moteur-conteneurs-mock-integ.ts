/**
 * Simulation HTTP du container-engine pour les tests d’intégration passerelle :
 * liste, création, cycle de vie, journaux JSON et flux SSE, sans Docker réel.
 */

const PREFIXE_DOCKER = 12;

function prefixeNormalise(id: string): string {
  return id.trim().toLowerCase().slice(0, PREFIXE_DOCKER);
}

function retirerConteneurParPrefixe(
  liste: Array<{ id: string }>,
  idCible: string,
): void {
  const p = prefixeNormalise(idCible);
  const i = liste.findIndex((c) => prefixeNormalise(c.id) === p);
  if (i >= 0) {
    liste.splice(i, 1);
  }
}

export type EtatMockMoteurConteneurs = {
  urlBase: string;
  conteneurs: Array<{ id: string }>;
  fluxSseOuverts: number;
  /** Identifiants pour lesquels le prochain flux SSE se ferme après le premier événement (simulation arrêt conteneur). */
  idsFluxSseCourt: Set<string>;
};

function corpsJson(obj: unknown, statut = 200): Response {
  return new Response(JSON.stringify(obj), {
    status: statut,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Fabrique un `fetch` qui intercepte uniquement les URL du moteur simulé et délègue le reste à `fetchReel`.
 */
export function creerFetchMockMoteurConteneurs(
  etat: EtatMockMoteurConteneurs,
  fetchReel: typeof fetch,
): typeof fetch {
  return async (entree, init) => {
    let href: string;
    if (typeof entree === "string") {
      href = entree;
    } else if (entree instanceof URL) {
      href = entree.href;
    } else {
      href = entree.url;
    }
    if (!href.startsWith(etat.urlBase)) {
      return fetchReel(entree, init);
    }

    const url = new URL(href);
    const chemin = url.pathname;
    const methode = (init?.method ?? "GET").toUpperCase();

    if (chemin === "/containers" && methode === "GET") {
      return corpsJson({ containers: [...etat.conteneurs] });
    }

    if (chemin === "/containers" && methode === "POST") {
      const suivant = etat.conteneurs.length + 1;
      const prefixeHex = suivant.toString(16).padStart(12, "0");
      const id = `${prefixeHex}${"0".repeat(52)}`.slice(0, 64);
      etat.conteneurs.push({ id });
      return corpsJson({ id, warnings: [] }, 201);
    }

    const matchSuppr = /^\/containers\/([^/]+)$/.exec(chemin);
    if (matchSuppr && methode === "DELETE") {
      retirerConteneurParPrefixe(etat.conteneurs, matchSuppr[1]);
      return new Response(null, { status: 204 });
    }

    const matchStart = /^\/containers\/([^/]+)\/start$/.exec(chemin);
    if (matchStart && methode === "POST") {
      return new Response(null, { status: 204 });
    }

    const matchStop = /^\/containers\/([^/]+)\/stop$/.exec(chemin);
    if (matchStop && methode === "POST") {
      return new Response(null, { status: 204 });
    }

    const matchLogsJson = /^\/containers\/([^/]+)\/logs$/.exec(chemin);
    if (matchLogsJson && methode === "GET") {
      return corpsJson({ logs: "ligne-mock\n" });
    }

    const matchStream = /^\/containers\/([^/]+)\/logs\/stream$/.exec(chemin);
    if (matchStream && methode === "GET") {
      const idConteneur = matchStream[1];
      const signal = init?.signal;
      const fluxCourt = etat.idsFluxSseCourt.has(idConteneur);
      if (fluxCourt) {
        etat.idsFluxSseCourt.delete(idConteneur);
      }

      let compteurLibere = false;
      let intervallePing: ReturnType<typeof setInterval> | undefined;

      const flux = new ReadableStream<Uint8Array>({
        start(controller) {
          etat.fluxSseOuverts += 1;
          const enc = new TextEncoder();
          const envoyerPing = (): void => {
            controller.enqueue(enc.encode("data: ping-mock\n\n"));
          };

          if (fluxCourt) {
            envoyerPing();
            etat.fluxSseOuverts -= 1;
            compteurLibere = true;
            controller.close();
            return;
          }

          intervallePing = setInterval(envoyerPing, 80);

          const libererFlux = (): void => {
            if (compteurLibere) {
              return;
            }
            compteurLibere = true;
            if (intervallePing !== undefined) {
              clearInterval(intervallePing);
            }
            etat.fluxSseOuverts -= 1;
            try {
              controller.close();
            } catch {
              /* flux déjà fermé */
            }
          };

          signal?.addEventListener("abort", libererFlux, { once: true });
        },
        cancel() {
          if (compteurLibere) {
            return;
          }
          compteurLibere = true;
          if (intervallePing !== undefined) {
            clearInterval(intervallePing);
          }
          etat.fluxSseOuverts -= 1;
        },
      });

      return new Response(flux, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    }

    return corpsJson(
      {
        error: {
          code: "NOT_FOUND",
          message: "Route moteur simulée non couverte.",
        },
      },
      404,
    );
  };
}

export function creerEtatMockMoteur(urlBase: string): EtatMockMoteurConteneurs {
  return {
    urlBase: urlBase.replace(/\/+$/, ""),
    conteneurs: [],
    fluxSseOuverts: 0,
    idsFluxSseCourt: new Set(),
  };
}
