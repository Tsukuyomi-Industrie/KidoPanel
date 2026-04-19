import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { obtenirMessageDiagnosticAucunBackendPareFeuActif } from "./diagnostic-backend-pare-feu-inactif.js";
import { obtenirBackendPareFeuHote } from "./selection-backend-pare-feu-hote.js";

const execFileAsync = promisify(execFile);

/**
 * Snapshot du pare-feu hôte vu par le moteur (consommé par la passerelle pour les bandeaux d’aide du panel).
 *
 * - **`automatisationActivee`** : faux si `CONTAINER_ENGINE_PAREFEU_AUTO=0`.
 * - **`backendChoisi`** : `firewalld`, `ufw` ou `null` si aucun backend actif.
 * - **`processusEstRoot`** : si vrai, le moteur exécute `firewall-cmd` / `ufw` sans `sudo`.
 * - **`sansSudoForce`** : `CONTAINER_ENGINE_PAREFEU_SANS_SUDO=1` (binaire appelé directement).
 * - **`messageDiagnostic`** : aide francophone à afficher en bandeau lorsque la situation n’est pas optimale
 *   (firewalld installé mais inactif, sudo NOPASSWD manquant, etc.).
 */
export type DiagnosticPareFeuHote = {
  automatisationActivee: boolean;
  backendChoisi: "firewalld" | "ufw" | null;
  processusEstRoot: boolean;
  sansSudoForce: boolean;
  /** Message court (français) destiné à l’affichage panel ; vide si la situation est nominale. */
  messageDiagnostic: string;
  /** Détails non structurés utiles au support (clé : valeur). */
  details: Record<string, string>;
};

function automatisationPareFeuActiveDepuisEnv(): boolean {
  return process.env.CONTAINER_ENGINE_PAREFEU_AUTO?.trim() !== "0";
}

function processusActuelEstRoot(): boolean {
  return typeof process.geteuid === "function" && process.geteuid() === 0;
}

function variableForceSansSudo(): boolean {
  return process.env.CONTAINER_ENGINE_PAREFEU_SANS_SUDO?.trim() === "1";
}

async function teterSudoNopasswdPour(binaireAbsolu: string): Promise<{
  ok: boolean;
  messageErreurCourt?: string;
}> {
  if (processusActuelEstRoot() || variableForceSansSudo()) {
    return { ok: true };
  }
  try {
    await execFileAsync("sudo", ["-n", binaireAbsolu, "--version"], {
      timeout: 4000,
    });
    return { ok: true };
  } catch (error_) {
    const stderr =
      error_ instanceof Error
        ? ((error_ as Error & { stderr?: Buffer }).stderr?.toString().trim() ??
            "")
        : "";
    if (stderr.length > 0) {
      const premiereLigne = stderr.split(/\r?\n/)[0]?.trim() ?? stderr;
      return { ok: false, messageErreurCourt: premiereLigne.slice(0, 200) };
    }
    return { ok: false, messageErreurCourt: "sudo -n a échoué (aucune sortie)" };
  }
}

/**
 * Calcule l’état pare-feu courant du moteur (sans modifier l’environnement) pour exposition HTTP.
 */
export async function obtenirDiagnosticPareFeuHote(): Promise<DiagnosticPareFeuHote> {
  const automatisationActivee = automatisationPareFeuActiveDepuisEnv();
  if (!automatisationActivee) {
    return {
      automatisationActivee: false,
      backendChoisi: null,
      processusEstRoot: processusActuelEstRoot(),
      sansSudoForce: variableForceSansSudo(),
      messageDiagnostic:
        "Ouverture automatique des ports désactivée (CONTAINER_ENGINE_PAREFEU_AUTO=0). Ouvrez manuellement les ports publiés sur votre pare-feu.",
      details: {
        CONTAINER_ENGINE_PAREFEU_AUTO:
          process.env.CONTAINER_ENGINE_PAREFEU_AUTO ?? "(non défini)",
        CONTAINER_ENGINE_PAREFEU_BACKEND:
          process.env.CONTAINER_ENGINE_PAREFEU_BACKEND ?? "(auto)",
      },
    };
  }

  const backend = await obtenirBackendPareFeuHote();
  const details: Record<string, string> = {
    CONTAINER_ENGINE_PAREFEU_AUTO:
      process.env.CONTAINER_ENGINE_PAREFEU_AUTO ?? "(non défini)",
    CONTAINER_ENGINE_PAREFEU_BACKEND:
      process.env.CONTAINER_ENGINE_PAREFEU_BACKEND ?? "(auto)",
    CONTAINER_ENGINE_PAREFEU_ZONE:
      process.env.CONTAINER_ENGINE_PAREFEU_ZONE ?? "(auto)",
    CONTAINER_ENGINE_PAREFEU_SANS_SUDO:
      process.env.CONTAINER_ENGINE_PAREFEU_SANS_SUDO ?? "(non défini)",
  };
  if (backend === null) {
    const messageDiagnostic =
      await obtenirMessageDiagnosticAucunBackendPareFeuActif();
    return {
      automatisationActivee: true,
      backendChoisi: null,
      processusEstRoot: processusActuelEstRoot(),
      sansSudoForce: variableForceSansSudo(),
      messageDiagnostic,
      details,
    };
  }

  const binaire =
    backend === "firewalld"
      ? (process.env.CONTAINER_ENGINE_PAREFEU_FIREWALL_CMD?.trim() ||
          "/usr/bin/firewall-cmd")
      : (process.env.CONTAINER_ENGINE_PAREFEU_UFW_CMD?.trim() ||
          "/usr/sbin/ufw");
  const sudoTest = await teterSudoNopasswdPour(binaire);
  if (!sudoTest.ok) {
    return {
      automatisationActivee: true,
      backendChoisi: backend,
      processusEstRoot: processusActuelEstRoot(),
      sansSudoForce: variableForceSansSudo(),
      messageDiagnostic:
        backend === "firewalld"
          ? `firewalld actif mais sudo NOPASSWD manquant pour ${binaire} : ajoutez « <utilisateur> ALL=(ALL) NOPASSWD: ${binaire} » dans /etc/sudoers.d/, ou définissez CONTAINER_ENGINE_PAREFEU_SANS_SUDO=1 si le moteur tourne déjà avec les droits requis. Détail : ${sudoTest.messageErreurCourt ?? ""}`
          : `UFW actif mais sudo NOPASSWD manquant pour ${binaire} : ajoutez « <utilisateur> ALL=(ALL) NOPASSWD: ${binaire} » dans /etc/sudoers.d/, ou définissez CONTAINER_ENGINE_PAREFEU_SANS_SUDO=1. Détail : ${sudoTest.messageErreurCourt ?? ""}`,
      details: { ...details, sudoErreur: sudoTest.messageErreurCourt ?? "" },
    };
  }

  return {
    automatisationActivee: true,
    backendChoisi: backend,
    processusEstRoot: processusActuelEstRoot(),
    sansSudoForce: variableForceSansSudo(),
    messageDiagnostic: "",
    details,
  };
}
