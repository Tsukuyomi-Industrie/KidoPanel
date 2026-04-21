import dotenv from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Charge `.env` puis `.env.local` à la racine du dépôt Git pour aligner passerelle et services métier.
 */
const racineMonorepo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const cheminEnvRacine = path.join(racineMonorepo, ".env");
const cheminEnvLocal = path.join(racineMonorepo, ".env.local");

function estIpv4PriveeCandidate(ip: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip.trim());
  if (m === null) {
    return false;
  }
  const a = Number.parseInt(m[1], 10);
  const b = Number.parseInt(m[2], 10);
  const c = Number.parseInt(m[3], 10);
  const d = Number.parseInt(m[4], 10);
  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    !Number.isFinite(c) ||
    !Number.isFinite(d) ||
    a > 255 ||
    b > 255 ||
    c > 255 ||
    d > 255
  ) {
    return false;
  }
  if (a === 10) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  return a === 192 && b === 168;
}

function detecterIpv4LanActive(): string | null {
  const interfaces = networkInterfaces();
  for (const [nom, entrees] of Object.entries(interfaces)) {
    if (entrees === undefined || nom.startsWith("lo")) {
      continue;
    }
    if (
      nom.startsWith("docker") ||
      nom.startsWith("br-") ||
      nom.startsWith("veth") ||
      nom.startsWith("tailscale")
    ) {
      continue;
    }
    for (const entree of entrees) {
      if (entree.family !== "IPv4" || entree.internal) {
        continue;
      }
      if (estIpv4PriveeCandidate(entree.address)) {
        return entree.address;
      }
    }
  }
  return null;
}

function ecrireHoteConnexionJeuxDansEnvSiAbsent(ipLan: string): void {
  let contenu = "";
  try {
    contenu = readFileSync(cheminEnvRacine, "utf8");
  } catch {
    return;
  }
  const lignePresente = /^GATEWAY_PUBLIC_HOST_FOR_CLIENTS=.*$/m.exec(contenu);
  if (lignePresente !== null) {
    const valeur = lignePresente[0].split("=").slice(1).join("=").trim();
    if (valeur.length > 0) {
      return;
    }
    const remplace = contenu.replace(
      /^GATEWAY_PUBLIC_HOST_FOR_CLIENTS=.*$/m,
      `GATEWAY_PUBLIC_HOST_FOR_CLIENTS=${ipLan}`,
    );
    writeFileSync(cheminEnvRacine, remplace, "utf8");
    return;
  }
  const suffixe = contenu.endsWith("\n") ? "" : "\n";
  writeFileSync(
    cheminEnvRacine,
    `${contenu}${suffixe}GATEWAY_PUBLIC_HOST_FOR_CLIENTS=${ipLan}\n`,
    "utf8",
  );
}

dotenv.config({ path: cheminEnvRacine });
dotenv.config({ path: cheminEnvLocal });

const hoteJeuxConfigure = process.env.GATEWAY_PUBLIC_HOST_FOR_CLIENTS?.trim() ?? "";
if (hoteJeuxConfigure.length === 0) {
  const ipv4Lan = detecterIpv4LanActive();
  if (ipv4Lan !== null) {
    process.env.GATEWAY_PUBLIC_HOST_FOR_CLIENTS = ipv4Lan;
    ecrireHoteConnexionJeuxDansEnvSiAbsent(ipv4Lan);
  }
}
