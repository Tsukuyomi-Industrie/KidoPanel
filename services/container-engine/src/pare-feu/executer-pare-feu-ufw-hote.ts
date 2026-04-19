import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resoudreInvocationSudoPourBinaireSysteme } from "./invocation-sudo-binaire-hote.js";
import type { PublicationHotePareFeu } from "./types-publication-hote-pare-feu.js";

const executerFichier = promisify(execFile);

export function formaterErreurExecUfw(error_: unknown): string {
  if (!(error_ instanceof Error)) {
    return String(error_);
  }
  const avecStderr = error_ as Error & { stderr?: Buffer };
  const errStd = avecStderr.stderr?.toString?.()?.trim();
  const base = error_.message;
  return errStd !== undefined && errStd.length > 0 ? `${base} | ${errStd}` : base;
}

/** Indique si UFW est installé et activé (`Status: active`). */
export async function testerUfwActifSurHote(): Promise<boolean> {
  const { executable, prefixeArguments } = resoudreInvocationSudoPourBinaireSysteme({
    cheminDefautAbsolu: "/usr/sbin/ufw",
    cleEnvChemin: "CONTAINER_ENGINE_PAREFEU_UFW_CMD",
  });
  try {
    const resultat = await executerFichier(executable, [...prefixeArguments, "status"], {
      encoding: "utf8",
      timeout: 15_000,
    });
    const texte =
      typeof resultat === "object" &&
      resultat !== null &&
      "stdout" in resultat &&
      typeof (resultat as { stdout: unknown }).stdout === "string"
        ? (resultat as { stdout: string }).stdout
        : "";
    return texte.includes("Status: active");
  } catch {
    return false;
  }
}

/**
 * Ouvre un port via `ufw allow …/tcp|udp`.
 */
export async function ouvrirPortUfwHote(
  publication: PublicationHotePareFeu,
): Promise<{ ok: boolean; messageErreur?: string }> {
  const { executable, prefixeArguments } = resoudreInvocationSudoPourBinaireSysteme({
    cheminDefautAbsolu: "/usr/sbin/ufw",
    cleEnvChemin: "CONTAINER_ENGINE_PAREFEU_UFW_CMD",
  });
  const spec = `${String(publication.numero)}/${publication.protocole}`;
  try {
    await executerFichier(
      executable,
      [...prefixeArguments, "allow", spec],
      {
        timeout: 120_000,
      },
    );
    return { ok: true };
  } catch (error_) {
    return {
      ok: false,
      messageErreur: formaterErreurExecUfw(error_),
    };
  }
}

/**
 * Retire une règle équivalente (`ufw delete allow …`).
 */
export async function fermerPortUfwHote(
  publication: PublicationHotePareFeu,
): Promise<{ ok: boolean; messageErreur?: string }> {
  const { executable, prefixeArguments } = resoudreInvocationSudoPourBinaireSysteme({
    cheminDefautAbsolu: "/usr/sbin/ufw",
    cleEnvChemin: "CONTAINER_ENGINE_PAREFEU_UFW_CMD",
  });
  const spec = `${String(publication.numero)}/${publication.protocole}`;
  try {
    await executerFichier(
      executable,
      [...prefixeArguments, "delete", "allow", spec],
      {
        timeout: 120_000,
      },
    );
    return { ok: true };
  } catch (error_) {
    return {
      ok: false,
      messageErreur: formaterErreurExecUfw(error_),
    };
  }
}
