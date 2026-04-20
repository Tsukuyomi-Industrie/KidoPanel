import { formaterErreurReseauFetch } from "../lab/passerelleErreursAffichageLab.js";
import { lireJetonPasserelle } from "./jetonPasserelleStockage.js";
import { urlBasePasserelle } from "./url-base-passerelle.js";

export type InstanceServeurJeuxPasserelle = {
  id: string;
  userId: string;
  name: string;
  gameType: string;
  status: string;
  containerId: string | null;
  /** Port TCP sur l’hôte mappé sur le port jeu du conteneur (attribution dynamique si 0 côté Docker). */
  port: number | null;
  memoryMb: number;
  cpuCores: number;
  diskGb: number;
  reseauInterneUtilisateurId?: string | null;
};

function assemblerUrl(cheminRelatif: string): string {
  const base = urlBasePasserelle().replace(/\/$/, "");
  const chemin = cheminRelatif.startsWith("/") ? cheminRelatif : `/${cheminRelatif}`;
  return `${base}${chemin}`;
}

/** Construit le message d’error_ affiché (inclut details.causeConnexion si la passerelle l’expose, ex. ECONNREFUSED). */
function messageErreurPasserelleDepuisJson(
  json: unknown,
  statutHttp: number,
): string {
  if (typeof json !== "object" || json === null || !("error" in json)) {
    return `Erreur HTTP ${String(statutHttp)}`;
  }
  const corps = (
    json as {
      error?: {
        message?: string;
        details?: { causeConnexion?: string };
      };
    }
  ).error;
  let message =
    typeof corps?.message === "string"
      ? corps.message
      : `Erreur HTTP ${String(statutHttp)}`;
  const cause = corps?.details?.causeConnexion;
  if (typeof cause === "string" && cause.trim().length > 0) {
    message = `${message} (${cause.trim()})`;
  }
  return message;
}

async function appelerJsonAuthentifie(
  chemin: string,
  init: RequestInit,
): Promise<Response> {
  const jeton = lireJetonPasserelle().trim();
  if (!jeton) {
    throw new Error("Jeton d’accès absent : reconnectez-vous au panel.");
  }
  const url = assemblerUrl(chemin);
  try {
    return await fetch(url, {
      ...init,
      mode: "cors",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${jeton}`,
        ...init.headers,
      },
    });
  } catch (error_) {
    throw new Error(formaterErreurReseauFetch(url, error_));
  }
}

/** Liste les instances jeu visibles pour le compte courant (via `/serveurs-jeux/instances`). */
export async function listerInstancesServeursJeuxPasserelle(): Promise<
  InstanceServeurJeuxPasserelle[]
> {
  const reponse = await appelerJsonAuthentifie("/serveurs-jeux/instances", {
    method: "GET",
  });
  const json = (await reponse.json()) as unknown;
  if (!reponse.ok) {
    throw new Error(messageErreurPasserelleDepuisJson(json, reponse.status));
  }
  if (
    typeof json !== "object" ||
    json === null ||
    !("instances" in json) ||
    !Array.isArray((json as { instances: unknown }).instances)
  ) {
    throw new Error("Réponse liste instances jeu illisible.");
  }
  return (json as { instances: InstanceServeurJeuxPasserelle[] }).instances;
}

/** Détail d’une instance jeu par identifiant Prisma. */
export async function obtenirInstanceServeurJeuxPasserelle(
  idInstance: string,
): Promise<InstanceServeurJeuxPasserelle> {
  const reponse = await appelerJsonAuthentifie(
    `/serveurs-jeux/instances/${encodeURIComponent(idInstance)}`,
    { method: "GET" },
  );
  const json = (await reponse.json()) as unknown;
  if (!reponse.ok) {
    throw new Error(messageErreurPasserelleDepuisJson(json, reponse.status));
  }
  return json as InstanceServeurJeuxPasserelle;
}

export type CorpsCreationInstanceServeurJeux = {
  name: string;
  gameType: string;
  memoryMb: number;
  cpuCores: number;
  diskGb: number;
  env?: Record<string, string>;
  reseauInterneUtilisateurId?: string;
  attacherReseauKidopanelComplement?: boolean;
  reseauPrimaireKidopanel?: boolean;
};

/** Demande le démarrage du conteneur associé à une instance jeu. */
export async function demarrerInstanceServeurJeuxPasserelle(
  idInstance: string,
): Promise<InstanceServeurJeuxPasserelle> {
  const reponse = await appelerJsonAuthentifie(
    `/serveurs-jeux/instances/${encodeURIComponent(idInstance)}/start`,
    { method: "POST" },
  );
  const json = (await reponse.json()) as unknown;
  if (!reponse.ok) {
    throw new Error(messageErreurPasserelleDepuisJson(json, reponse.status));
  }
  return json as InstanceServeurJeuxPasserelle;
}

/** Demande l’arrêt du conteneur associé à une instance jeu. */
export async function arreterInstanceServeurJeuxPasserelle(
  idInstance: string,
): Promise<InstanceServeurJeuxPasserelle> {
  const reponse = await appelerJsonAuthentifie(
    `/serveurs-jeux/instances/${encodeURIComponent(idInstance)}/stop`,
    { method: "POST" },
  );
  const json = (await reponse.json()) as unknown;
  if (!reponse.ok) {
    throw new Error(messageErreurPasserelleDepuisJson(json, reponse.status));
  }
  return json as InstanceServeurJeuxPasserelle;
}

/** Demande le redémarrage du conteneur associé à une instance jeu. */
export async function redemarrerInstanceServeurJeuxPasserelle(
  idInstance: string,
): Promise<InstanceServeurJeuxPasserelle> {
  const reponse = await appelerJsonAuthentifie(
    `/serveurs-jeux/instances/${encodeURIComponent(idInstance)}/restart`,
    { method: "POST" },
  );
  const json = (await reponse.json()) as unknown;
  if (!reponse.ok) {
    throw new Error(messageErreurPasserelleDepuisJson(json, reponse.status));
  }
  return json as InstanceServeurJeuxPasserelle;
}

/** Supprime définitivement une instance jeu et son conteneur orchestré côté moteur. */
export async function supprimerInstanceServeurJeuxPasserelle(idInstance: string): Promise<void> {
  const reponse = await appelerJsonAuthentifie(
    `/serveurs-jeux/instances/${encodeURIComponent(idInstance)}`,
    { method: "DELETE" },
  );
  if (!reponse.ok) {
    let corpsJson: unknown = null;
    try {
      corpsJson = await reponse.json();
    } catch {
      /* réponse vide ou non JSON */
    }
    throw new Error(
      corpsJson === null
        ? messageErreurPasserelleDepuisJson(corpsJson, reponse.status)
        : `Erreur HTTP ${String(reponse.status)}`,
    );
  }
}

/** Demande la création d’une instance jeu via le corps métier (POST /serveurs-jeux/instances). */
export async function creerInstanceServeurJeuxPasserelle(
  corps: CorpsCreationInstanceServeurJeux,
): Promise<InstanceServeurJeuxPasserelle> {
  const reponse = await appelerJsonAuthentifie("/serveurs-jeux/instances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  const json = (await reponse.json()) as unknown;
  if (!reponse.ok) {
    throw new Error(messageErreurPasserelleDepuisJson(json, reponse.status));
  }
  return json as InstanceServeurJeuxPasserelle;
}
