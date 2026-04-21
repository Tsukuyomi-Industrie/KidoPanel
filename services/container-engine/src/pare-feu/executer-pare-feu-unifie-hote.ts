import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  fermerPortFirewalldHote,
  ouvrirPortFirewalldHote,
  resoudreInvocationFirewallCmd,
} from "./executer-firewalld-hote.js";
import {
  fermerPortUfwHote,
  fermerSortieUfwHote,
  type RegleSortanteUfw,
  ouvrirSortieUfwHote,
  ouvrirPortUfwHote,
} from "./executer-pare-feu-ufw-hote.js";
import { obtenirBackendPareFeuHote } from "./selection-backend-pare-feu-hote.js";
import type { PublicationHotePareFeu } from "./types-publication-hote-pare-feu.js";

const executerFichier = promisify(execFile);

/**
 * Recharge firewalld après des changements `--permanent` (à appeler une fois par lot d’opérations).
 */
export async function rechargerRuntimeFirewalldApresModifications(): Promise<void> {
  const { executable, argumentsVersFirewalld } = resoudreInvocationFirewallCmd();
  try {
    await executerFichier(
      executable,
      [...argumentsVersFirewalld, "--reload"],
      { timeout: 120_000 },
    );
  } catch {
    /* Les ajouts runtime sans reload ont souvent déjà effet ; reload best-effort. */
  }
}

/**
 * Ouvre le port sur le backend détecté (firewalld ou UFW).
 */
export async function ouvrirPortPareFeuHoteUnifie(
  publication: PublicationHotePareFeu,
): Promise<{
  ok: boolean;
  messageErreur?: string;
  backend?: string;
}> {
  const backend = await obtenirBackendPareFeuHote();
  if (backend === null) {
    return {
      ok: false,
      messageErreur:
        "Aucun pare-feu utilisable : firewalld et UFW inactifs ou inaccessibles (sudo). Définissez CONTAINER_ENGINE_PAREFEU_BACKEND=firewalld|ufw ou corrigez sudoers NOPASSWD pour /usr/bin/firewall-cmd et /usr/sbin/ufw.",
    };
  }
  if (backend === "firewalld") {
    const r = await ouvrirPortFirewalldHote(publication);
    return { ...r, backend: "firewalld" };
  }
  const r = await ouvrirPortUfwHote(publication);
  return { ...r, backend: "ufw" };
}

/**
 * Ferme le port sur le même backend que l’ouverture (détection identique).
 */
export async function fermerPortPareFeuHoteUnifie(
  publication: PublicationHotePareFeu,
): Promise<{
  ok: boolean;
  messageErreur?: string;
  backend?: string;
}> {
  const backend = await obtenirBackendPareFeuHote();
  if (backend === null) {
    return { ok: true };
  }
  if (backend === "firewalld") {
    const r = await fermerPortFirewalldHote(publication);
    return { ...r, backend: "firewalld" };
  }
  const r = await fermerPortUfwHote(publication);
  return { ...r, backend: "ufw" };
}

/**
 * Ouvre une règle sortante dédiée (plage TCP/UDP) ; UFW applique la règle, firewalld est laissé inchangé.
 */
export async function ouvrirSortiePareFeuHoteUnifie(
  regle: RegleSortanteUfw,
): Promise<{ ok: boolean; messageErreur?: string; backend?: string }> {
  const backend = await obtenirBackendPareFeuHote();
  if (backend === null) {
    return { ok: false, messageErreur: "Aucun backend pare-feu actif détecté." };
  }
  if (backend === "firewalld") {
    return { ok: true, backend: "firewalld" };
  }
  const r = await ouvrirSortieUfwHote(regle);
  return { ...r, backend: "ufw" };
}

/**
 * Retire une règle sortante dédiée (plage TCP/UDP) ; UFW applique la règle, firewalld est laissé inchangé.
 */
export async function fermerSortiePareFeuHoteUnifie(
  regle: RegleSortanteUfw,
): Promise<{ ok: boolean; messageErreur?: string; backend?: string }> {
  const backend = await obtenirBackendPareFeuHote();
  if (backend === null) {
    return { ok: true };
  }
  if (backend === "firewalld") {
    return { ok: true, backend: "firewalld" };
  }
  const r = await fermerSortieUfwHote(regle);
  return { ...r, backend: "ufw" };
}
