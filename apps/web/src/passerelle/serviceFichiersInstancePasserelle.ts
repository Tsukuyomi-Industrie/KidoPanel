import {
  appelerJsonAuthentifiePasserelle,
  lireJsonReponseOuNull,
} from "./client-http-authentifie-passerelle.js";

export type EntreeListeFichiersPasserelle = {
  nom: string;
  repertoire: boolean;
  tailleOctets: number | null;
  dateCreationIso: string | null;
  dateModificationIso: string | null;
};

function messageErreurDepuisJson(json: unknown, statutHttp: number): string {
  if (
    typeof json === "object" &&
    json !== null &&
    "error" in json &&
    typeof (json as { error?: { message?: unknown } }).error?.message === "string"
  ) {
    return (json as { error: { message: string } }).error.message;
  }
  return `Erreur HTTP ${String(statutHttp)}`;
}

/** Liste le contenu d’un répertoire absolu dans le conteneur d’une instance jeu. */
export async function listerFichiersInstanceServeurJeuxPasserelle(
  idInstance: string,
  cheminAbsolu: string,
): Promise<EntreeListeFichiersPasserelle[]> {
  const url = `/serveurs-jeux/instances/${encodeURIComponent(idInstance)}/fs/list?path=${encodeURIComponent(cheminAbsolu)}`;
  const reponse = await appelerJsonAuthentifiePasserelle(url, { method: "GET" });
  const json = await lireJsonReponseOuNull(reponse);
  if (!reponse.ok) {
    throw new Error(messageErreurDepuisJson(json, reponse.status));
  }
  if (
    typeof json !== "object" ||
    json === null ||
    !("entries" in json) ||
    !Array.isArray((json as { entries: unknown }).entries)
  ) {
    throw new Error("Réponse liste fichiers illisible.");
  }
  return (json as { entries: EntreeListeFichiersPasserelle[] }).entries;
}

/** Lit un fichier texte dans le conteneur d’une instance jeu. */
export async function lireFichierInstanceServeurJeuxPasserelle(
  idInstance: string,
  cheminAbsolu: string,
): Promise<string> {
  const url = `/serveurs-jeux/instances/${encodeURIComponent(idInstance)}/fs/content?path=${encodeURIComponent(cheminAbsolu)}`;
  const reponse = await appelerJsonAuthentifiePasserelle(url, { method: "GET" });
  const json = await lireJsonReponseOuNull(reponse);
  if (!reponse.ok) {
    throw new Error(messageErreurDepuisJson(json, reponse.status));
  }
  if (
    typeof json !== "object" ||
    json === null ||
    typeof (json as { contentUtf8?: unknown }).contentUtf8 !== "string"
  ) {
    throw new Error("Réponse lecture fichier illisible.");
  }
  return (json as { contentUtf8: string }).contentUtf8;
}

/** Enregistre un fichier texte dans le conteneur d’une instance jeu. */
export async function ecrireFichierInstanceServeurJeuxPasserelle(
  idInstance: string,
  cheminAbsolu: string,
  contenuUtf8: string,
): Promise<void> {
  const url = `/serveurs-jeux/instances/${encodeURIComponent(idInstance)}/fs/content?path=${encodeURIComponent(cheminAbsolu)}`;
  const reponse = await appelerJsonAuthentifiePasserelle(url, {
    method: "PUT",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: contenuUtf8,
  });
  if (!reponse.ok) {
    const json = await lireJsonReponseOuNull(reponse);
    throw new Error(messageErreurDepuisJson(json, reponse.status));
  }
}

/** Supprime un fichier ou répertoire dans le conteneur d’une instance jeu. */
export async function supprimerCheminInstanceServeurJeuxPasserelle(
  idInstance: string,
  cheminAbsolu: string,
): Promise<void> {
  const url = `/serveurs-jeux/instances/${encodeURIComponent(idInstance)}/fs?path=${encodeURIComponent(cheminAbsolu)}`;
  const reponse = await appelerJsonAuthentifiePasserelle(url, { method: "DELETE" });
  if (!reponse.ok) {
    const json = await lireJsonReponseOuNull(reponse);
    throw new Error(messageErreurDepuisJson(json, reponse.status));
  }
}

/** Compresse un fichier ou dossier en archive zip dans le conteneur d’une instance jeu. */
export async function compresserCheminInstanceServeurJeuxPasserelle(
  idInstance: string,
  sourcePath: string,
  archivePath: string,
): Promise<void> {
  const url = `/serveurs-jeux/instances/${encodeURIComponent(idInstance)}/fs/zip`;
  const reponse = await appelerJsonAuthentifiePasserelle(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourcePath, archivePath }),
  });
  if (!reponse.ok) {
    const json = await lireJsonReponseOuNull(reponse);
    throw new Error(messageErreurDepuisJson(json, reponse.status));
  }
}

/** Décompresse une archive zip dans le conteneur d’une instance jeu. */
export async function decompresserArchiveInstanceServeurJeuxPasserelle(
  idInstance: string,
  archivePath: string,
  destinationPath: string,
): Promise<void> {
  const url = `/serveurs-jeux/instances/${encodeURIComponent(idInstance)}/fs/unzip`;
  const reponse = await appelerJsonAuthentifiePasserelle(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archivePath, destinationPath }),
  });
  if (!reponse.ok) {
    const json = await lireJsonReponseOuNull(reponse);
    throw new Error(messageErreurDepuisJson(json, reponse.status));
  }
}

/** Liste le contenu d’un répertoire dans le conteneur d’une instance web. */
export async function listerFichiersInstanceWebPasserelle(
  idInstance: string,
  cheminAbsolu: string,
): Promise<EntreeListeFichiersPasserelle[]> {
  const url = `/web-instances/${encodeURIComponent(idInstance)}/fs/list?path=${encodeURIComponent(cheminAbsolu)}`;
  const reponse = await appelerJsonAuthentifiePasserelle(url, { method: "GET" });
  const json = await lireJsonReponseOuNull(reponse);
  if (!reponse.ok) {
    throw new Error(messageErreurDepuisJson(json, reponse.status));
  }
  if (
    typeof json !== "object" ||
    json === null ||
    !("entries" in json) ||
    !Array.isArray((json as { entries: unknown }).entries)
  ) {
    throw new Error("Réponse liste fichiers illisible.");
  }
  return (json as { entries: EntreeListeFichiersPasserelle[] }).entries;
}

/** Lit un fichier texte dans le conteneur d’une instance web. */
export async function lireFichierInstanceWebPasserelle(
  idInstance: string,
  cheminAbsolu: string,
): Promise<string> {
  const url = `/web-instances/${encodeURIComponent(idInstance)}/fs/content?path=${encodeURIComponent(cheminAbsolu)}`;
  const reponse = await appelerJsonAuthentifiePasserelle(url, { method: "GET" });
  const json = await lireJsonReponseOuNull(reponse);
  if (!reponse.ok) {
    throw new Error(messageErreurDepuisJson(json, reponse.status));
  }
  if (
    typeof json !== "object" ||
    json === null ||
    typeof (json as { contentUtf8?: unknown }).contentUtf8 !== "string"
  ) {
    throw new Error("Réponse lecture fichier illisible.");
  }
  return (json as { contentUtf8: string }).contentUtf8;
}

/** Enregistre un fichier texte dans le conteneur d’une instance web. */
export async function ecrireFichierInstanceWebPasserelle(
  idInstance: string,
  cheminAbsolu: string,
  contenuUtf8: string,
): Promise<void> {
  const url = `/web-instances/${encodeURIComponent(idInstance)}/fs/content?path=${encodeURIComponent(cheminAbsolu)}`;
  const reponse = await appelerJsonAuthentifiePasserelle(url, {
    method: "PUT",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: contenuUtf8,
  });
  if (!reponse.ok) {
    const json = await lireJsonReponseOuNull(reponse);
    throw new Error(messageErreurDepuisJson(json, reponse.status));
  }
}

/** Supprime un chemin dans le conteneur d’une instance web. */
export async function supprimerCheminInstanceWebPasserelle(
  idInstance: string,
  cheminAbsolu: string,
): Promise<void> {
  const url = `/web-instances/${encodeURIComponent(idInstance)}/fs?path=${encodeURIComponent(cheminAbsolu)}`;
  const reponse = await appelerJsonAuthentifiePasserelle(url, { method: "DELETE" });
  if (!reponse.ok) {
    const json = await lireJsonReponseOuNull(reponse);
    throw new Error(messageErreurDepuisJson(json, reponse.status));
  }
}

/** Compresse un fichier ou dossier en archive zip dans le conteneur d’une instance web. */
export async function compresserCheminInstanceWebPasserelle(
  idInstance: string,
  sourcePath: string,
  archivePath: string,
): Promise<void> {
  const url = `/web-instances/${encodeURIComponent(idInstance)}/fs/zip`;
  const reponse = await appelerJsonAuthentifiePasserelle(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourcePath, archivePath }),
  });
  if (!reponse.ok) {
    const json = await lireJsonReponseOuNull(reponse);
    throw new Error(messageErreurDepuisJson(json, reponse.status));
  }
}

/** Décompresse une archive zip dans le conteneur d’une instance web. */
export async function decompresserArchiveInstanceWebPasserelle(
  idInstance: string,
  archivePath: string,
  destinationPath: string,
): Promise<void> {
  const url = `/web-instances/${encodeURIComponent(idInstance)}/fs/unzip`;
  const reponse = await appelerJsonAuthentifiePasserelle(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archivePath, destinationPath }),
  });
  if (!reponse.ok) {
    const json = await lireJsonReponseOuNull(reponse);
    throw new Error(messageErreurDepuisJson(json, reponse.status));
  }
}
