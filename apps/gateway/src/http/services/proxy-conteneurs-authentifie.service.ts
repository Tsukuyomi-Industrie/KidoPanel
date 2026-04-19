import type { Context } from "hono";
import type { ContainerOwnershipRepository } from "../../auth/container-ownership-repository.prisma.js";
import {
  filtrerConteneursVisiblesPourUtilisateur,
  verifierAccesUtilisateurAuConteneur,
} from "../../auth/verify-container-ownership.js";
import {
  estRoleAdministrateur,
  estRoleLectureSeule,
} from "../../auth/autorisation-role.middleware.js";
import type { UtilisateurPublic } from "../../auth/user.types.js";
import { journaliserPasserelle } from "../../observabilite/journal-json.js";
import { forwardRequestToContainerEngine } from "../proxy/container-engine-proxy.js";
import type { VariablesGateway } from "../types/gateway-variables.js";
import { proxyFluxJournauxSseAvecPropriete } from "./proxy-flux-journaux-sse.service.js";
import { transformerCorpsCreationConteneurPourMoteur } from "./transformation-corps-creation-conteneur.service.js";
import { ErreurCorpsCreationInstance } from "./erreur-corps-creation-instance.js";

type ListeConteneursAmont = { containers: Array<{ id: string }> };

type CreationConteneurAmont = {
  id: string;
  warnings?: string[];
  ipReseauInterne?: string;
};

/** Chemin HTTP normalisé pour les comparaisons de route (URL absolue ou relative côté Hono). */
function obtenirCheminHttpPourRoutage(
  c: Context<{ Variables: VariablesGateway }>,
): string {
  return new URL(c.req.url, "http://127.0.0.1").pathname;
}

/** Indique une requête `GET /containers/:id/logs/stream` (SSE), sans confondre avec un suffixe du type `logs/streaming`. */
function estRequeteFluxJournauxSse(methode: string, pathname: string): boolean {
  if (methode !== "GET") {
    return false;
  }
  const segments = pathname.split("/").filter(Boolean);
  return (
    segments.length === 4 &&
    segments[0] === "containers" &&
    segments[2] === "logs" &&
    segments[3] === "stream"
  );
}

function reponseJsonErreur(
  code: string,
  message: string,
  statut: number,
): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status: statut,
    headers: { "Content-Type": "application/json" },
  });
}

function journaliserRefusAccesConteneur(
  c: Context<{ Variables: VariablesGateway }>,
  metadata: Record<string, unknown>,
): void {
  journaliserPasserelle({
    niveau: "warn",
    message: "acces_conteneur_refuse",
    requestId: c.get("requestId"),
    metadata,
  });
}

/**
 * Liste des conteneurs : relais vers le moteur puis filtrage par propriété en base (route dédiée `GET /` du sous-routeur).
 */
export async function proxyListeConteneursGet(
  c: Context<{ Variables: VariablesGateway }>,
  utilisateur: UtilisateurPublic,
  depotPropriete: ContainerOwnershipRepository,
): Promise<Response> {
  const chemin = obtenirCheminHttpPourRoutage(c);
  // Docker `listContainers` sans `all` n’inclut pas les conteneurs créés ou arrêtés ; le filtre propriété s’applique ensuite.
  const amont = await forwardRequestToContainerEngine(c, {
    parametresRequeteFusion: { all: "true" },
  });
  if (!amont.ok) {
    if (amont.status >= 500) {
      journaliserPasserelle({
        niveau: "error",
        message: "proxy_moteur_reponse_5xx",
        requestId: c.get("requestId"),
        metadata: { statut: amont.status, chemin },
      });
    }
    return amont;
  }
  const brut = await amont.text();
  let parse: ListeConteneursAmont;
  try {
    parse = JSON.parse(brut) as ListeConteneursAmont;
  } catch {
    return reponseJsonErreur(
      "AMONT_INVALIDE",
      "Réponse du moteur de conteneurs illisible pour la liste.",
      502,
    );
  }
  const listeBrute = Array.isArray(parse.containers) ? parse.containers : [];
  const liste = listeBrute.filter(
    (entree): entree is { id: string } =>
      entree !== null &&
      typeof entree === "object" &&
      typeof (entree as { id?: unknown }).id === "string" &&
      (entree as { id: string }).id.length > 0,
  );
  const filtrees = await filtrerConteneursVisiblesPourUtilisateur(
    depotPropriete,
    utilisateur,
    liste,
  );
  return new Response(JSON.stringify({ containers: filtrees }), {
    status: amont.status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Création de conteneur : relais puis enregistrement de la propriété si le moteur renvoie 201 (route dédiée `POST /`).
 */
export async function proxyCreationConteneursPost(
  c: Context<{ Variables: VariablesGateway }>,
  utilisateur: UtilisateurPublic,
  depotPropriete: ContainerOwnershipRepository,
): Promise<Response> {
  const chemin = obtenirCheminHttpPourRoutage(c);
  if (estRoleLectureSeule(utilisateur.role)) {
    journaliserPasserelle({
      niveau: "warn",
      message: "creation_conteneur_refusee_role_lecture_seule",
      requestId: c.get("requestId"),
      metadata: { utilisateurId: utilisateur.id },
    });
    return reponseJsonErreur(
      "ROLE_INSUFFICIENT",
      "Le rôle observateur ne permet pas de créer des instances conteneurisées.",
      403,
    );
  }
  const brutCorps = await c.req.text();
  let corpsRemplacement: Uint8Array;
  if (brutCorps.trim().length === 0) {
    corpsRemplacement = new Uint8Array(0);
  } else {
    let parse: unknown;
    try {
      parse = JSON.parse(brutCorps) as unknown;
    } catch {
      return reponseJsonErreur(
        "CORPS_JSON_INVALIDE",
        "Le corps JSON de création de conteneur est invalide.",
        400,
      );
    }
    try {
      const transforme = transformerCorpsCreationConteneurPourMoteur(parse);
      corpsRemplacement = new TextEncoder().encode(JSON.stringify(transforme));
    } catch (error_) {
      if (error_ instanceof ErreurCorpsCreationInstance) {
        journaliserPasserelle({
          niveau: "info",
          message: "creation_conteneur_rejet_corps_instance",
          requestId: c.get("requestId"),
          metadata: {
            codeMetier: error_.codeMetier,
            utilisateurId: utilisateur.id,
          },
        });
        return reponseJsonErreur(
          error_.codeMetier,
          error_.message,
          400,
        );
      }
      throw error_;
    }
  }
  const amont = await forwardRequestToContainerEngine(c, {
    corpsRemplacement,
  });
  if (!amont.ok && amont.status >= 500) {
    journaliserPasserelle({
      niveau: "error",
      message: "proxy_moteur_reponse_5xx",
      requestId: c.get("requestId"),
      metadata: { statut: amont.status, chemin },
    });
  }
  if (amont.status === 201) {
    const brut = await amont.text();
    let parse: CreationConteneurAmont;
    try {
      parse = JSON.parse(brut) as CreationConteneurAmont;
    } catch {
      return new Response(brut, {
        status: amont.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (typeof parse.id === "string" && parse.id.length > 0) {
      await depotPropriete.addOwnership(utilisateur.id, parse.id);
    }
    return new Response(JSON.stringify(parse), {
      status: amont.status,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(amont.body, {
    status: amont.status,
    headers: amont.headers,
  });
}

/**
 * Relais pour les chemins sous `/:id` (start, stop, logs, suppression) avec contrôle de propriété.
 */
export async function proxyConteneursAvecPropriete(
  c: Context<{ Variables: VariablesGateway }>,
  utilisateur: UtilisateurPublic,
  depotPropriete: ContainerOwnershipRepository,
): Promise<Response> {
  const methode = c.req.method;
  const chemin = obtenirCheminHttpPourRoutage(c);

  const idParam = (c.req.param("id") ?? "").trim();
  if (idParam.length === 0) {
    journaliserRefusAccesConteneur(c, {
      raison: "identifiant_conteneur_absent",
      utilisateurId: utilisateur.id,
      chemin,
    });
    return reponseJsonErreur(
      "CONTAINER_ACCESS_DENIED",
      "Ce conteneur n’existe pas pour votre compte ou ne vous appartient pas.",
      403,
    );
  }
  if (estRoleLectureSeule(utilisateur.role) && methode !== "GET") {
    journaliserRefusAccesConteneur(c, {
      raison: "role_observateur_mutation_interdite",
      utilisateurId: utilisateur.id,
      methodeHttp: methode,
      chemin,
    });
    return reponseJsonErreur(
      "ROLE_INSUFFICIENT",
      "Le rôle observateur limite les actions aux lectures (journaux).",
      403,
    );
  }
  const autorise = await verifierAccesUtilisateurAuConteneur(
    depotPropriete,
    utilisateur,
    idParam,
  );
  if (!autorise) {
    journaliserRefusAccesConteneur(c, {
      raison: "propriete_non_verifiee",
      utilisateurId: utilisateur.id,
      idConteneurDemande: idParam,
      chemin,
    });
    return reponseJsonErreur(
      "CONTAINER_ACCESS_DENIED",
      "Ce conteneur n’existe pas pour votre compte ou ne vous appartient pas.",
      403,
    );
  }
  const idConteneurPourSuppression = idParam;

  if (estRequeteFluxJournauxSse(methode, chemin)) {
    return proxyFluxJournauxSseAvecPropriete(
      c,
      utilisateur,
      idConteneurPourSuppression,
      depotPropriete,
    );
  }

  const amont = await forwardRequestToContainerEngine(c);
  if (!amont.ok && amont.status >= 500) {
    journaliserPasserelle({
      niveau: "error",
      message: "proxy_moteur_reponse_5xx",
      requestId: c.get("requestId"),
      metadata: { statut: amont.status, chemin },
    });
  }

  if (
    methode === "DELETE" &&
    amont.status >= 200 &&
    amont.status < 300
  ) {
    if (estRoleAdministrateur(utilisateur.role)) {
      await depotPropriete.supprimerToutesProprietesPourConteneurDocker(
        idConteneurPourSuppression,
      );
    } else {
      await depotPropriete.removeOwnershipForUser(
        utilisateur.id,
        idConteneurPourSuppression,
      );
    }
  }

  return amont;
}
