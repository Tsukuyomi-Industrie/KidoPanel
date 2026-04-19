import { Hono } from "hono";
import { creerMiddlewareAuthObligatoire } from "../../auth/auth.middleware.js";
import { journaliserErreurPasserelle } from "../../observabilite/journal-json.js";
import { EN_TETE_ID_REQUETE_INTERNE } from "../constantes-correlation-http.js";
import type { VariablesGateway } from "../types/gateway-variables.js";

/**
 * Transforme le chemin entrant du client en chemin attendu par server-service (`/instances`, etc.).
 * Prend en charge un préfixe parasite `/__kidopanel_gateway` si la requête atteint la passerelle sans réécriture amont.
 */
function suffixeCheminVersServiceInstancesJeux(pathnameBrut: string): string {
  let p = pathnameBrut;
  if (p.startsWith("/__kidopanel_gateway")) {
    p = p.slice("/__kidopanel_gateway".length) || "/";
  }
  if (!p.startsWith("/")) {
    p = `/${p}`;
  }
  if (p.startsWith("/serveurs-jeux")) {
    p = p.slice("/serveurs-jeux".length) || "/";
  }
  return p.startsWith("/") ? p : `/${p}`;
}

/**
 * Relais HTTP JWT vers `server-service` pour les routes `/instances` exposées sous `/serveurs-jeux`.
 */
export function monterRoutesServeursJeuSiConfigure(
  app: Hono<{ Variables: VariablesGateway }>,
  secretJwt: Uint8Array,
  urlBaseServeurJeux: string | undefined,
): void {
  if (!urlBaseServeurJeux) {
    return;
  }

  const sousRouteur = new Hono<{ Variables: VariablesGateway }>();
  sousRouteur.use("*", creerMiddlewareAuthObligatoire(secretJwt));

  sousRouteur.all("*", async (c) => {
    const utilisateur = c.get("utilisateur");
    if (utilisateur === undefined) {
      return c.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Session requise pour les instances jeu.",
          },
        },
        401,
      );
    }

    const urlEntrante = new URL(c.req.url, "http://127.0.0.1");
    const suffixeChemin = suffixeCheminVersServiceInstancesJeux(
      urlEntrante.pathname,
    );
    let cible: URL;
    try {
      cible = new URL(
        suffixeChemin + urlEntrante.search,
        `${urlBaseServeurJeux.replace(/\/+$/, "")}/`,
      );
    } catch (erreur) {
      journaliserErreurPasserelle(
        "relais_serveurs_jeu_url_invalide",
        erreur,
        c.get("requestId"),
      );
      return c.json(
        {
          error: {
            code: "RELAI_SERVEURS_JEU_CONFIGURATION",
            message:
              "URL du service instances jeu invalide : vérifiez SERVER_SERVICE_BASE_URL sur la passerelle.",
          },
        },
        500,
      );
    }

    const enTetesSortie = new Headers();
    enTetesSortie.set(
      "x-kidopanel-utilisateur-id",
      utilisateur.id,
    );
    enTetesSortie.set(
      "x-kidopanel-role-utilisateur",
      utilisateur.role,
    );
    enTetesSortie.set(
      EN_TETE_ID_REQUETE_INTERNE,
      c.get("requestId"),
    );

    const methode = c.req.method;
    const avecCorps =
      methode !== "GET" &&
      methode !== "HEAD" &&
      methode !== "OPTIONS";

    let corps: ArrayBuffer | undefined;
    if (avecCorps) {
      corps = await c.req.arrayBuffer();
    }

    const typeContenu = c.req.header("content-type");
    if (typeContenu !== undefined && avecCorps && corps !== undefined) {
      enTetesSortie.set("Content-Type", typeContenu);
    }

    let reponseAmont: Response;
    try {
      reponseAmont = await fetch(cible.toString(), {
        method: methode,
        headers: enTetesSortie,
        body:
          corps !== undefined && corps.byteLength > 0 ? corps : undefined,
      });
    } catch (erreur) {
      journaliserErreurPasserelle(
        "relais_serveurs_jeu_fetch_echoue",
        erreur,
        c.get("requestId"),
      );
      return c.json(
        {
          error: {
            code: "SERVICE_INSTANCES_JEU_INJOIGNABLE",
            message:
              "Impossible de joindre le service instances jeu (server-service). Démarrez-le sur le port 8790 ou indiquez SERVER_SERVICE_BASE_URL sur la passerelle. Si le service tourne déjà, vérifiez le pare-feu et que l’URL pointe vers la bonne machine (éviter 127.0.0.1 depuis un conteneur sans accès à l’hôte).",
          },
        },
        502,
      );
    }

    const enTetesReponse = new Headers(reponseAmont.headers);
    enTetesReponse.delete("transfer-encoding");
    return new Response(reponseAmont.body, {
      status: reponseAmont.status,
      headers: enTetesReponse,
    });
  });

  app.route("/serveurs-jeux", sousRouteur);
}
