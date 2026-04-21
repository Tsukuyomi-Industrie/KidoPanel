import {
  appelerJsonAuthentifiePasserelle,
  lireJsonReponseOuNull,
} from "./client-http-authentifie-passerelle.js";

export type CorpsExecConteneurPasserelle = {
  readonly cmd: readonly string[];
  readonly stdinUtf8?: string;
};

export type ResultatExecConteneurPasserelle = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

function messageErreurPasserelleDepuisJson(json: unknown, statutHttp: number): string {
  if (
    typeof json !== "object" ||
    json === null ||
    !("error" in json) ||
    typeof (json as { error?: { message?: unknown } }).error?.message !== "string"
  ) {
    return `Erreur HTTP ${String(statutHttp)}`;
  }
  return (json as { error: { message: string } }).error.message;
}

/** Exécute une commande dans le conteneur d’une instance jeu (relai `POST …/instances/:id/exec`). */
export async function posterExecInstanceServeurJeuxPasserelle(
  idInstance: string,
  corps: CorpsExecConteneurPasserelle,
): Promise<ResultatExecConteneurPasserelle> {
  const reponse = await appelerJsonAuthentifiePasserelle(
    `/serveurs-jeux/instances/${encodeURIComponent(idInstance)}/exec`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: [...corps.cmd],
        stdinUtf8: corps.stdinUtf8,
      }),
    },
  );
  const json = await lireJsonReponseOuNull(reponse);
  if (!reponse.ok) {
    throw new Error(messageErreurPasserelleDepuisJson(json, reponse.status));
  }
  if (
    typeof json !== "object" ||
    json === null ||
    typeof (json as { exitCode?: unknown }).exitCode !== "number"
  ) {
    throw new Error("Réponse d’exécution conteneur illisible.");
  }
  const sortie = json as {
    exitCode: number;
    stdout?: unknown;
    stderr?: unknown;
  };
  return {
    exitCode: sortie.exitCode,
    stdout: typeof sortie.stdout === "string" ? sortie.stdout : "",
    stderr: typeof sortie.stderr === "string" ? sortie.stderr : "",
  };
}

/** Exécute une commande dans le conteneur d’une instance web. */
export async function posterExecInstanceWebPasserelle(
  idInstanceWeb: string,
  corps: CorpsExecConteneurPasserelle,
): Promise<ResultatExecConteneurPasserelle> {
  const reponse = await appelerJsonAuthentifiePasserelle(
    `/web-instances/${encodeURIComponent(idInstanceWeb)}/exec`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: [...corps.cmd],
        stdinUtf8: corps.stdinUtf8,
      }),
    },
  );
  const json = await lireJsonReponseOuNull(reponse);
  if (!reponse.ok) {
    throw new Error(messageErreurPasserelleDepuisJson(json, reponse.status));
  }
  if (
    typeof json !== "object" ||
    json === null ||
    typeof (json as { exitCode?: unknown }).exitCode !== "number"
  ) {
    throw new Error("Réponse d’exécution conteneur illisible.");
  }
  const sortie = json as {
    exitCode: number;
    stdout?: unknown;
    stderr?: unknown;
  };
  return {
    exitCode: sortie.exitCode,
    stdout: typeof sortie.stdout === "string" ? sortie.stdout : "",
    stderr: typeof sortie.stderr === "string" ? sortie.stderr : "",
  };
}
