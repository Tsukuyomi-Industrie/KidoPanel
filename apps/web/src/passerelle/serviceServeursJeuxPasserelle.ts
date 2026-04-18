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
  memoryMb: number;
  cpuCores: number;
  diskGb: number;
};

function assemblerUrl(cheminRelatif: string): string {
  const base = urlBasePasserelle().replace(/\/$/, "");
  const chemin = cheminRelatif.startsWith("/") ? cheminRelatif : `/${cheminRelatif}`;
  return `${base}${chemin}`;
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
  } catch (erreur) {
    throw new Error(formaterErreurReseauFetch(url, erreur));
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
    const msg =
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof (json as { error?: { message?: unknown } }).error?.message ===
        "string"
        ? (json as { error: { message: string } }).error.message
        : `Erreur HTTP ${String(reponse.status)}`;
    throw new Error(msg);
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
    const msg =
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof (json as { error?: { message?: unknown } }).error?.message ===
        "string"
        ? (json as { error: { message: string } }).error.message
        : `Erreur HTTP ${String(reponse.status)}`;
    throw new Error(msg);
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
};

/** Demande la création d’une instance via le service jeu (variables d’environnement métier incluses). */
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
    const msg =
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof (json as { error?: { message?: unknown } }).error?.message ===
        "string"
        ? (json as { error: { message: string } }).error.message
        : `Erreur HTTP ${String(reponse.status)}`;
    throw new Error(msg);
  }
  return json as InstanceServeurJeuxPasserelle;
}
