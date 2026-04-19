import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PublicationHotePareFeu } from "./types-publication-hote-pare-feu.js";

const executerFichier = promisify(execFile);

/** Retourne le chemin du binaire firewalld (chemin absolu pour sudo). */
export function obtenirCheminBinaireFirewallCmd(): string {
  const brut = process.env.CONTAINER_ENGINE_PAREFEU_FIREWALL_CMD?.trim();
  return brut !== undefined && brut.length > 0 ? brut : "/usr/bin/firewall-cmd";
}

/** Indique si le processus Node tourne avec les droits root (pas besoin de sudo). */
export function processusEstPrivilegieRoot(): boolean {
  return typeof process.geteuid === "function" && process.geteuid() === 0;
}

function argumentsZoneOptionnels(): string[] {
  const zone = process.env.CONTAINER_ENGINE_PAREFEU_ZONE?.trim();
  if (zone === undefined || zone.length === 0) {
    return [];
  }
  return [`--zone=${zone}`];
}

/**
 * Construit l’invocation : en root ou si PAREFEU_SANS_SUDO=1, appel direct du binaire ;
 * sinon `sudo -n` (sans invite ; exige une règle sudoers NOPASSWD pour firewall-cmd).
 */
export function resoudreInvocationFirewallCmd(): {
  executable: string;
  argumentsVersFirewalld: string[];
} {
  const binaire = obtenirCheminBinaireFirewallCmd();
  if (processusEstPrivilegieRoot()) {
    return { executable: binaire, argumentsVersFirewalld: [] };
  }
  if (process.env.CONTAINER_ENGINE_PAREFEU_SANS_SUDO?.trim() === "1") {
    return { executable: binaire, argumentsVersFirewalld: [] };
  }
  return {
    executable: "sudo",
    argumentsVersFirewalld: ["-n", binaire],
  };
}

/** Détaille une erreur execFile (stderr Docker / firewalld souvent utile). */
export function formaterErreurExecFirewalld(erreur: unknown): string {
  if (!(erreur instanceof Error)) {
    return String(erreur);
  }
  const avecStderr = erreur as Error & { stderr?: Buffer };
  const errStd = avecStderr.stderr?.toString?.()?.trim();
  const base = erreur.message;
  return errStd !== undefined && errStd.length > 0 ? `${base} | ${errStd}` : base;
}

/**
 * Indique si firewalld répond (même logique que les commandes d’ouverture de port).
 */
export async function testerFirewalldActifSurHote(): Promise<boolean> {
  const { executable, argumentsVersFirewalld } = resoudreInvocationFirewallCmd();
  try {
    await executerFichier(executable, [...argumentsVersFirewalld, "--state"], {
      timeout: 15_000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Ouvre un port TCP/UDP sur le pare-feu (règle permanente + application immédiate).
 */
export async function ouvrirPortFirewalldHote(
  publication: PublicationHotePareFeu,
): Promise<{ ok: boolean; messageErreur?: string }> {
  const { executable, argumentsVersFirewalld } = resoudreInvocationFirewallCmd();
  const zone = argumentsZoneOptionnels();
  const spec = `${String(publication.numero)}/${publication.protocole}`;
  const argsPermanent = [
    ...argumentsVersFirewalld,
    ...zone,
    "--permanent",
    `--add-port=${spec}`,
  ];
  const argsRuntime = [...argumentsVersFirewalld, ...zone, `--add-port=${spec}`];
  try {
    await executerFichier(executable, argsPermanent, { timeout: 60_000 });
    await executerFichier(executable, argsRuntime, { timeout: 60_000 });
    return { ok: true };
  } catch (erreur) {
    return {
      ok: false,
      messageErreur: formaterErreurExecFirewalld(erreur),
    };
  }
}

/**
 * Retire un port TCP/UDP du pare-feu (permanent et session).
 */
export async function fermerPortFirewalldHote(
  publication: PublicationHotePareFeu,
): Promise<{ ok: boolean; messageErreur?: string }> {
  const { executable, argumentsVersFirewalld } = resoudreInvocationFirewallCmd();
  const zone = argumentsZoneOptionnels();
  const spec = `${String(publication.numero)}/${publication.protocole}`;
  const argsPermanent = [
    ...argumentsVersFirewalld,
    ...zone,
    "--permanent",
    `--remove-port=${spec}`,
  ];
  const argsRuntime = [...argumentsVersFirewalld, ...zone, `--remove-port=${spec}`];
  try {
    await executerFichier(executable, argsPermanent, { timeout: 60_000 });
    await executerFichier(executable, argsRuntime, { timeout: 60_000 });
    return { ok: true };
  } catch (erreur) {
    return {
      ok: false,
      messageErreur: formaterErreurExecFirewalld(erreur),
    };
  }
}
