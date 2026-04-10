import type { Context } from "hono";
import { getContainerEngineBaseUrl } from "../../config/gateway-env.js";

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
  c: Context,
): Promise<Response> {
  const base = getContainerEngineBaseUrl();
  const entrant = new URL(c.req.url);
  const cible = new URL(entrant.pathname + entrant.search, `${base}/`);

  const enTetes = new Headers();
  for (const [nom, valeur] of c.req.raw.headers) {
    if (!EN_TETES_HOP_PAR_HOP.has(nom.toLowerCase())) {
      enTetes.set(nom, valeur);
    }
  }

  const methode = c.req.method;
  let corps: ArrayBuffer | undefined;
  if (methode !== "GET" && methode !== "HEAD") {
    corps = await c.req.arrayBuffer();
  }

  let amont: Response;
  try {
    amont = await fetch(cible, { method: methode, headers: enTetes, body: corps });
  } catch (erreur) {
    console.error("[gateway] Connexion au container-engine impossible :", erreur);
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
