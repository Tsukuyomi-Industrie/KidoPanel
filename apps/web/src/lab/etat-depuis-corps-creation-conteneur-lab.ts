import {
  etatInitialCreationConteneurLab,
  type EtatCreationConteneurLab,
} from "./etatCreationConteneurLab.js";

const CLES_CORPS_PREMIER_NIVEAU_FORMULAIRE = new Set([
  "image",
  "name",
  "cmd",
  "entrypoint",
  "workingDir",
  "user",
  "hostname",
  "domainname",
  "macAddress",
  "stopSignal",
  "platform",
  "stopTimeout",
  "networkDisabled",
  "attachStdin",
  "attachStdout",
  "attachStderr",
  "stdinOnce",
  "env",
  "labels",
  "tty",
  "openStdin",
  "hostConfig",
  "networkingConfig",
  "healthcheck",
]);

const NOMS_POLITIQUE = new Set([
  "no",
  "always",
  "on-failure",
  "unless-stopped",
]);

/** Reconstruit les lignes de liaison de ports à partir de `portBindings` du corps API. */
function liaisonsPortsTexteDepuisPortBindings(
  portBindings: Record<string, unknown>,
): string {
  const lignes: string[] = [];
  for (const [portConteneur, liaisons] of Object.entries(portBindings)) {
    if (!Array.isArray(liaisons)) {
      continue;
    }
    for (const liaison of liaisons) {
      if (liaison === null || typeof liaison !== "object") {
        continue;
      }
      const l = liaison as { hostIp?: unknown; hostPort?: unknown };
      const hostPort = String(l.hostPort ?? "").trim();
      if (hostPort.length === 0) {
        continue;
      }
      const hostIp =
        typeof l.hostIp === "string" && l.hostIp.trim().length > 0
          ? l.hostIp.trim()
          : undefined;
      const partieHote = hostIp ? `${hostIp}:${hostPort}` : hostPort;
      lignes.push(`${portConteneur}=${partieHote}`);
    }
  }
  return lignes.join("\n");
}

/** Transforme un enregistrement clé/valeur en lignes `CLE=VALEUR`. */
function enregistrementVersLignesCleValeur(
  enr: Record<string, unknown> | undefined,
): string {
  if (!enr) {
    return "";
  }
  return Object.entries(enr)
    .map(([cle, valeur]) => `${cle}=${String(valeur)}`)
    .join("\n");
}

/** Convertit des octets en chaîne mégaoctets entiers pour le formulaire. */
function octetsVersChaineMo(octets: number): string {
  if (!Number.isFinite(octets) || octets <= 0) {
    return "";
  }
  return String(Math.round(octets / (1024 * 1024)));
}

/**
 * Projette un corps `POST /containers` (objet JSON) sur l’état du formulaire laboratoire.
 * Lève une erreur si la structure minimale (objet avec `image` non vide) est absente.
 */
export function etatDepuisCorpsCreationConteneurLab(
  brut: unknown,
): EtatCreationConteneurLab {
  if (brut === null || typeof brut !== "object" || Array.isArray(brut)) {
    throw new Error("La configuration doit être un objet JSON.");
  }
  const c = brut as Record<string, unknown>;
  const imageBrut = c.image;
  if (typeof imageBrut !== "string" || imageBrut.trim().length === 0) {
    throw new Error(
      "Le champ « image » est obligatoire dans le JSON (référence d’image Docker).",
    );
  }

  const base = etatInitialCreationConteneurLab();
  const etat: EtatCreationConteneurLab = {
    ...base,
    image: imageBrut.trim(),
  };

  const supplementTop: Record<string, unknown> = {};
  for (const [cle, valeur] of Object.entries(c)) {
    if (!CLES_CORPS_PREMIER_NIVEAU_FORMULAIRE.has(cle)) {
      supplementTop[cle] = valeur;
    }
  }
  etat.jsonCorpsSupplementaireTop =
    Object.keys(supplementTop).length > 0
      ? JSON.stringify(supplementTop, null, 2)
      : "";

  const nom = c.name;
  if (typeof nom === "string") {
    etat.nom = nom;
  }
  if (Array.isArray(c.cmd)) {
    etat.cmdLignes = c.cmd.map((x) => String(x)).join("\n");
  } else if (typeof c.cmd === "string" && c.cmd.length > 0) {
    etat.cmdLignes = c.cmd;
  }
  if (Array.isArray(c.entrypoint)) {
    etat.entrypointLignes = c.entrypoint.map((x) => String(x)).join("\n");
  } else if (typeof c.entrypoint === "string" && c.entrypoint.length > 0) {
    etat.entrypointLignes = c.entrypoint;
  }
  if (typeof c.workingDir === "string") {
    etat.repertoireTravail = c.workingDir;
  }
  if (typeof c.user === "string") {
    etat.utilisateur = c.user;
  }
  if (typeof c.hostname === "string") {
    etat.nomHote = c.hostname;
  }
  if (typeof c.domainname === "string") {
    etat.domaineConteneur = c.domainname;
  }
  if (typeof c.macAddress === "string") {
    etat.adresseMac = c.macAddress;
  }
  if (typeof c.stopSignal === "string") {
    etat.signalArret = c.stopSignal;
  }
  if (typeof c.platform === "string") {
    etat.platformeDocker = c.platform;
  }
  if (typeof c.stopTimeout === "number" && Number.isFinite(c.stopTimeout)) {
    etat.delaiArretSecondes = String(Math.round(c.stopTimeout));
  }
  if (c.networkDisabled === true) {
    etat.desactiverReseauConteneur = true;
  }
  if (c.attachStdin === true) {
    etat.attacherStdin = true;
  }
  if (c.attachStdout === true) {
    etat.attacherStdout = true;
  }
  if (c.attachStderr === true) {
    etat.attacherStderr = true;
  }
  if (c.stdinOnce === true) {
    etat.stdinUneFois = true;
  }
  if (c.env !== null && typeof c.env === "object" && !Array.isArray(c.env)) {
    etat.variablesEnvironnement = enregistrementVersLignesCleValeur(
      c.env as Record<string, unknown>,
    );
  }
  if (c.labels !== null && typeof c.labels === "object" && !Array.isArray(c.labels)) {
    etat.etiquettes = enregistrementVersLignesCleValeur(
      c.labels as Record<string, unknown>,
    );
  }
  if (c.tty === true) {
    etat.tty = true;
  }
  if (c.openStdin === true) {
    etat.entreeStandardOuverte = true;
  }

  const hc = c.hostConfig;
  if (hc !== null && typeof hc === "object" && !Array.isArray(hc)) {
    const h = { ...(hc as Record<string, unknown>) };

    if (
      typeof h.portBindings === "object" &&
      h.portBindings !== null &&
      !Array.isArray(h.portBindings)
    ) {
      etat.liaisonPortsTexte = liaisonsPortsTexteDepuisPortBindings(
        h.portBindings as Record<string, unknown>,
      );
      delete h.portBindings;
    }
    if (Array.isArray(h.binds)) {
      etat.montagesBinds = (h.binds as string[]).join("\n");
      delete h.binds;
    }
    const rp = h.restartPolicy;
    if (rp !== null && typeof rp === "object" && !Array.isArray(rp)) {
      const nomPolitique = (rp as { name?: unknown }).name;
      if (typeof nomPolitique === "string" && NOMS_POLITIQUE.has(nomPolitique)) {
        etat.politiqueRedemarrage =
          nomPolitique as EtatCreationConteneurLab["politiqueRedemarrage"];
      }
      const max = (rp as { maximumRetryCount?: unknown }).maximumRetryCount;
      if (typeof max === "number" && Number.isFinite(max) && max >= 0) {
        etat.tentativesMaxOnFailure = String(Math.round(max));
      }
      delete h.restartPolicy;
    }
    if (typeof h.networkMode === "string") {
      etat.modeReseau = h.networkMode;
      delete h.networkMode;
    }
    if (Array.isArray(h.dns)) {
      etat.dnsListe = (h.dns as unknown[]).map((x) => String(x)).join(", ");
      delete h.dns;
    }
    if (Array.isArray(h.dnsSearch)) {
      etat.rechercheDns = (h.dnsSearch as string[]).join(", ");
      delete h.dnsSearch;
    }
    if (Array.isArray(h.dnsOptions)) {
      etat.optionsDns = (h.dnsOptions as string[]).join(", ");
      delete h.dnsOptions;
    }
    if (Array.isArray(h.extraHosts)) {
      etat.hotesSupplementaires = (h.extraHosts as string[]).join(", ");
      delete h.extraHosts;
    }
    if (typeof h.ipcMode === "string") {
      etat.modeIpc = h.ipcMode;
      delete h.ipcMode;
    }
    if (typeof h.pidMode === "string") {
      etat.modePid = h.pidMode;
      delete h.pidMode;
    }
    if (typeof h.utsMode === "string") {
      etat.modeUts = h.utsMode;
      delete h.utsMode;
    }
    if (typeof h.usernsMode === "string") {
      etat.modeUserns = h.usernsMode;
      delete h.usernsMode;
    }
    if (h.cgroupnsMode === "private" || h.cgroupnsMode === "host") {
      etat.cgroupnsMode = h.cgroupnsMode;
      delete h.cgroupnsMode;
    }
    if (typeof h.runtime === "string") {
      etat.runtimeConteneur = h.runtime;
      delete h.runtime;
    }
    if (typeof h.memoryReservationBytes === "number") {
      etat.memoireReservationMegaOctets = octetsVersChaineMo(
        h.memoryReservationBytes,
      );
      delete h.memoryReservationBytes;
    }
    if (typeof h.memorySwapBytes === "number") {
      const ms = h.memorySwapBytes;
      etat.memoireSwapMegaOctets =
        ms === -1 ? "-1" : ms > 0 ? octetsVersChaineMo(ms) : "";
      delete h.memorySwapBytes;
    }
    if (typeof h.memorySwappiness === "number") {
      etat.swappiness = String(h.memorySwappiness);
      delete h.memorySwappiness;
    }
    if (h.oomKillDisable === true) {
      etat.oomKillDesactive = true;
      delete h.oomKillDisable;
    }
    if (typeof h.oomScoreAdj === "number") {
      etat.oomScoreAdj = String(h.oomScoreAdj);
      delete h.oomScoreAdj;
    }
    if (typeof h.blkioWeight === "number") {
      etat.blkioWeight = String(h.blkioWeight);
      delete h.blkioWeight;
    }
    if (typeof h.cgroupParent === "string") {
      etat.cgroupParent = h.cgroupParent;
      delete h.cgroupParent;
    }
    if (typeof h.volumeDriver === "string") {
      etat.piloteVolume = h.volumeDriver;
      delete h.volumeDriver;
    }
    if (Array.isArray(h.volumesFrom)) {
      etat.volumesFromLignes = (h.volumesFrom as string[]).join("\n");
      delete h.volumesFrom;
    }
    if (Array.isArray(h.deviceCgroupRules)) {
      etat.deviceCgroupRulesLignes = (h.deviceCgroupRules as string[]).join(
        "\n",
      );
      delete h.deviceCgroupRules;
    }
    if (Array.isArray(h.consoleSize) && h.consoleSize.length >= 2) {
      const [a, b] = h.consoleSize as unknown[];
      etat.consoleHauteur = String(a);
      etat.consoleLargeur = String(b);
      delete h.consoleSize;
    }
    if (Array.isArray(h.capAdd)) {
      etat.capacitesAjout = (h.capAdd as string[]).join(", ");
      delete h.capAdd;
    }
    if (Array.isArray(h.capDrop)) {
      etat.capacitesRetrait = (h.capDrop as string[]).join(", ");
      delete h.capDrop;
    }
    if (Array.isArray(h.securityOpts)) {
      etat.optionsSecurite = (h.securityOpts as string[]).join(", ");
      delete h.securityOpts;
    }
    if (h.privileged === true) {
      etat.privileged = true;
      delete h.privileged;
    }
    if (h.readonlyRootfs === true) {
      etat.racineLectureSeule = true;
      delete h.readonlyRootfs;
    }
    if (h.publishAllPorts === true) {
      etat.publierTousLesPorts = true;
      delete h.publishAllPorts;
    }
    if (typeof h.memoryBytes === "number") {
      etat.memoireMegaOctets = octetsVersChaineMo(h.memoryBytes);
      delete h.memoryBytes;
    }
    if (typeof h.nanoCpus === "number") {
      etat.nanoCpus = String(Math.round(h.nanoCpus));
      delete h.nanoCpus;
    }

    etat.jsonHostConfigExtra =
      Object.keys(h).length > 0 ? JSON.stringify(h, null, 2) : "";
  }

  if (c.networkingConfig !== null && typeof c.networkingConfig === "object") {
    etat.jsonConfigurationReseau = JSON.stringify(
      c.networkingConfig,
      null,
      2,
    );
  }
  if (c.healthcheck !== null && typeof c.healthcheck === "object") {
    etat.jsonHealthcheck = JSON.stringify(c.healthcheck, null, 2);
  }

  return etat;
}
