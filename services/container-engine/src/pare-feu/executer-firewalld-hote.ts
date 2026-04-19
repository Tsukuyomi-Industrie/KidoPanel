import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { journaliserMoteur } from "../observabilite/journal-json.js";
import { resoudreInvocationSudoPourBinaireSysteme } from "./invocation-sudo-binaire-hote.js";
import type { PublicationHotePareFeu } from "./types-publication-hote-pare-feu.js";

const executerFichier = promisify(execFile);

/**
 * Mémoïsation : lecture unique de la zone par défaut firewalld lorsque `CONTAINER_ENGINE_PAREFEU_ZONE` est absent,
 * pour que chaque `--add-port` cible la même interface que les connexions entrantes (Fedora / Nobara).
 */
let promesseArgumentsZoneImplicitite: Promise<string[]> | undefined;

/**
 * Retourne `--zone=…` pour les commandes firewall-cmd : variable d’environnement explicite,
 * sinon résultat de `firewall-cmd --get-default-zone` (même invocation sudo que les autres appels).
 */
export async function obtenirArgumentsZoneFirewalldEffectifs(): Promise<string[]> {
  const brut = process.env.CONTAINER_ENGINE_PAREFEU_ZONE?.trim();
  if (brut !== undefined && brut.length > 0) {
    return [`--zone=${brut}`];
  }
  promesseArgumentsZoneImplicitite ??= (async (): Promise<string[]> => {
    const { executable, argumentsVersFirewalld } = resoudreInvocationFirewallCmd();
    try {
      const resultat = await executerFichier(
        executable,
        [...argumentsVersFirewalld, "--get-default-zone"],
        { timeout: 15_000 },
      );
      const sortie = String(resultat.stdout ?? "").trim();
      const zone = sortie.trim().split(/\r?\n/)[0]?.trim() ?? "";
      if (zone.length > 0) {
        journaliserMoteur({
          niveau: "info",
          message: "pare_feu_hote_zone_firewalld_defaut_detectee",
          metadata: { zone },
        });
        return [`--zone=${zone}`];
      }
    } catch {
      /* lecture impossible : conserver le comportement sans `--zone` (firewall-cmd peut tout de même appliquer selon contexte) */
    }
    return [];
  })();
  return promesseArgumentsZoneImplicitite;
}

/** Retourne le chemin du binaire firewalld (chemin absolu pour sudo). */
export function obtenirCheminBinaireFirewallCmd(): string {
  const brut = process.env.CONTAINER_ENGINE_PAREFEU_FIREWALL_CMD?.trim();
  return brut !== undefined && brut.length > 0 ? brut : "/usr/bin/firewall-cmd";
}

/** Indique si le processus Node tourne avec les droits root (pas besoin de sudo). */
export function processusEstPrivilegieRoot(): boolean {
  return typeof process.geteuid === "function" && process.geteuid() === 0;
}

/**
 * Construit l’invocation : en root ou si PAREFEU_SANS_SUDO=1, appel direct du binaire ;
 * sinon `sudo -n` (sans invite ; exige une règle sudoers NOPASSWD pour firewall-cmd).
 */
export function resoudreInvocationFirewallCmd(): {
  executable: string;
  argumentsVersFirewalld: string[];
} {
  const r = resoudreInvocationSudoPourBinaireSysteme({
    cheminDefautAbsolu: "/usr/bin/firewall-cmd",
    cleEnvChemin: "CONTAINER_ENGINE_PAREFEU_FIREWALL_CMD",
  });
  return {
    executable: r.executable,
    argumentsVersFirewalld: r.prefixeArguments,
  };
}

/** Détaille une error_ execFile (stderr Docker / firewalld souvent utile). */
export function formaterErreurExecFirewalld(error_: unknown): string {
  if (!(error_ instanceof Error)) {
    return String(error_);
  }
  const avecStderr = error_ as Error & { stderr?: Buffer };
  const errStd = avecStderr.stderr?.toString?.()?.trim();
  const base = error_.message;
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
  const zone = await obtenirArgumentsZoneFirewalldEffectifs();
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
  } catch (error_) {
    return {
      ok: false,
      messageErreur: formaterErreurExecFirewalld(error_),
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
  const zone = await obtenirArgumentsZoneFirewalldEffectifs();
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
  } catch (error_) {
    return {
      ok: false,
      messageErreur: formaterErreurExecFirewalld(error_),
    };
  }
}
