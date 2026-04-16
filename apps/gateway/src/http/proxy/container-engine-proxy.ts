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

/**
 * Relaie la requête entrante vers le container-engine en conservant chemin, requête et corps,
 * sans aucun accès à Docker depuis la passerelle.
 */
export async function forwardRequestToContainerEngine(
  c: Context<{ Variables: VariablesGateway }>,
): Promise<Response> {
  const base = getContainerEngineBaseUrl();
  // Base factice : `c.req.url` peut être une URL relative (« /containers ») selon l’hôte Hono.
  const entrant = new URL(c.req.url, "http://127.0.0.1");
  const cible = new URL(entrant.pathname + entrant.search, `${base}/`);

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
  let corps: ArrayBuffer | undefined;
  if (methode !== "GET" && methode !== "HEAD") {
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
  } catch (erreur) {
    if (
      erreur instanceof Error &&
      (erreur.name === "AbortError" ||
        (typeof DOMException !== "undefined" &&
          erreur instanceof DOMException &&
          erreur.name === "AbortError"))
    ) {
      return new Response(null, { status: 204 });
    }
    journaliserErreurPasserelle(
      "proxy_container_engine_indisponible",
      erreur,
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
