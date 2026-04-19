import type { Context } from "hono";
import { getContainerEngineBaseUrl } from "../../config/gateway-env.js";
import { journaliserErreurPasserelle } from "../../observabilite/journal-json.js";
import { EN_TETE_ID_REQUETE_INTERNE } from "../constantes-correlation-http.js";
import type { VariablesGateway } from "../types/gateway-variables.js";
import { obtenirSignalAnnulationPourFetchAmont } from "../util/signal-annulation-requete-client.js";

const EN_TETES_HOP_PAR_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
]);

const EN_TETES_REPONSE_A_FILTRER = new Set(["transfer-encoding", "connection"]);

/** Options optionnelles pour ajuster l’URL relais sans modifier la requête cliente. */
export type OptionsRelaisVersContainerEngine = {
  /**
   * Paramètres de requête fusionnés sur l’URL entrante (remplacement par clé) avant appel au moteur.
   * Sert notamment à imposer `all=true` sur le listage Docker tout en laissant le client sans paramètre.
   */
  parametresRequeteFusion?: Record<string, string>;
  /**
   * Corps HTTP de remplacement (ex. après transformation passerelle du JSON `POST /containers`).
   * Si défini, le corps de la requête entrante n’est pas relu.
   */
  corpsRemplacement?: ArrayBuffer | Uint8Array;
  /**
   * Chemin absolu API moteur à utiliser à la place de `pathname` entrant (ex. `/reseaux-internes`).
   * Nécessaire lorsque la route est montée sous la passerelle et que `pathname` vaut `/` au lieu du préfixe réel.
   */
  cheminRelaisForceSurMoteur?: string;
};

/**
 * Relaie la requête entrante vers le container-engine en conservant chemin, requête et corps,
 * sans aucun accès à Docker depuis la passerelle.
 */
export async function forwardRequestToContainerEngine(
  c: Context<{ Variables: VariablesGateway }>,
  options?: OptionsRelaisVersContainerEngine,
): Promise<Response> {
  const base = getContainerEngineBaseUrl();
  // Base factice : `c.req.url` peut être une URL relative (« /containers ») selon l’hôte Hono.
  const entrant = new URL(c.req.url, "http://127.0.0.1");
  if (options?.parametresRequeteFusion) {
    for (const [cle, valeur] of Object.entries(options.parametresRequeteFusion)) {
      entrant.searchParams.set(cle, valeur);
    }
  }
  const cheminForce = options?.cheminRelaisForceSurMoteur?.trim();
  let pathnameRelais = entrant.pathname;
  if (cheminForce !== undefined && cheminForce.length > 0) {
    pathnameRelais = cheminForce.startsWith("/") ? cheminForce : `/${cheminForce}`;
  }
  const cible = new URL(pathnameRelais + entrant.search, `${base}/`);

  const enTetes = new Headers();
  for (const [nom, valeur] of c.req.raw.headers) {
    const cle = nom.toLowerCase();
    if (EN_TETES_HOP_PAR_HOP.has(cle)) {
      continue;
    }
    // Le moteur de conteneurs ne valide pas le JWT de la passerelle : on évite de lui transmettre le secret utilisateur.
    if (cle === "authorization") {
      continue;
    }
    if (cle === EN_TETE_ID_REQUETE_INTERNE.toLowerCase()) {
      continue;
    }
    enTetes.set(nom, valeur);
  }

  const idCorrelation = c.get("requestId");
  enTetes.set(EN_TETE_ID_REQUETE_INTERNE, idCorrelation);

  const methode = c.req.method;
  let corps: ArrayBuffer | Uint8Array | undefined;
  if (options?.corpsRemplacement !== undefined) {
    corps = options.corpsRemplacement;
  } else if (methode !== "GET" && methode !== "HEAD") {
    corps = await c.req.arrayBuffer();
  }

  const signalAnnulation = obtenirSignalAnnulationPourFetchAmont(c);

  let amont: Response;
  try {
    amont = await fetch(cible, {
      method: methode,
      headers: enTetes,
      body: corps,
      ...(signalAnnulation ? { signal: signalAnnulation } : {}),
    });
  } catch (error_) {
    if (
      error_ instanceof Error &&
      (error_.name === "AbortError" ||
        (typeof DOMException !== "undefined" &&
          error_ instanceof DOMException &&
          error_.name === "AbortError"))
    ) {
      return new Response(null, { status: 204 });
    }
    journaliserErreurPasserelle(
      "proxy_container_engine_indisponible",
      error_,
      idCorrelation,
    );
    return new Response(
      JSON.stringify({
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message:
            "Le service container-engine n’est pas joignable depuis la passerelle.",
        },
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const sortie = new Headers(amont.headers);
  for (const nom of EN_TETES_REPONSE_A_FILTRER) {
    sortie.delete(nom);
  }

  return new Response(amont.body, {
    status: amont.status,
    headers: sortie,
  });
}
