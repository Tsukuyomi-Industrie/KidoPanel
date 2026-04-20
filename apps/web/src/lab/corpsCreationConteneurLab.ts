import type { EtatCreationConteneurLab } from "./etatCreationConteneurLab.js";

/** Découpe une zone de texte en lignes non vides. */
function lignesNonVides(texte: string): string[] {
  return texte
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** Transforme des lignes `CLE=VALEUR` en dictionnaire (variables ou étiquettes). */
function lignesCleValeurVersObjet(
  texte: string,
): Record<string, string> | undefined {
  const lignes = lignesNonVides(texte);
  if (lignes.length === 0) {
    return undefined;
  }
  const sortie: Record<string, string> = {};
  for (const ligne of lignes) {
    const idx = ligne.indexOf("=");
    if (idx <= 0) {
      continue;
    }
    const cle = ligne.slice(0, idx).trim();
    const valeur = ligne.slice(idx + 1).trim();
    if (cle.length > 0) {
      sortie[cle] = valeur;
    }
  }
  return Object.keys(sortie).length > 0 ? sortie : undefined;
}

/** Transforme une liste séparée par virgules en tableau de chaînes. */
function listeSepareeVirgules(texte: string): string[] | undefined {
  const elements = texte
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return elements.length > 0 ? elements : undefined;
}

/** Interprète les lignes `portConteneur/protocole=hôte` pour expositions et liaisons. */
function liaisonsPortsDepuisTexte(texte: string): {
  exposedPorts: string[] | undefined;
  portBindings: Record<string, { hostIp?: string; hostPort: string }[]> | undefined;
} {
  const lignes = lignesNonVides(texte);
  if (lignes.length === 0) {
    return { exposedPorts: undefined, portBindings: undefined };
  }
  const exposes = new Set<string>();
  const liaisons: Record<string, { hostIp?: string; hostPort: string }[]> = {};
  for (const ligne of lignes) {
    const idx = ligne.indexOf("=");
    if (idx <= 0) {
      continue;
    }
    const portConteneur = ligne.slice(0, idx).trim();
    const partieHote = ligne.slice(idx + 1).trim();
    if (!portConteneur || !partieHote) {
      continue;
    }
    exposes.add(portConteneur);
    let hostIp: string | undefined;
    let hostPort = partieHote;
    const dernierDeuxPoints = partieHote.lastIndexOf(":");
    if (dernierDeuxPoints > 0 && dernierDeuxPoints < partieHote.length - 1) {
      const candidatIp = partieHote.slice(0, dernierDeuxPoints);
      const candidatPort = partieHote.slice(dernierDeuxPoints + 1);
      if (/^[0-9a-fA-F.:]+$/.test(candidatIp) || candidatIp.includes(".")) {
        hostIp = candidatIp;
        hostPort = candidatPort;
      }
    }
    if (!liaisons[portConteneur]) {
      liaisons[portConteneur] = [];
    }
    liaisons[portConteneur].push({ hostIp, hostPort });
  }
  return {
    exposedPorts: exposes.size > 0 ? [...exposes] : undefined,
    portBindings: Object.keys(liaisons).length > 0 ? liaisons : undefined,
  };
}

/** Fusion superficielle d’objets enregistrés (clés de `ajout` écrasent `base`). */
function fusionObjetsEnregistrements(
  base: Record<string, unknown> | undefined,
  ajout: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!base && !ajout) {
    return undefined;
  }
  if (base === undefined) {
    return ajout;
  }
  if (ajout === undefined) {
    return base;
  }
  return { ...base, ...ajout };
}

/**
 * Construit le corps JSON `POST /containers` à partir du formulaire laboratoire.
 * Lève une erreur si un bloc JSON facultatif est renseigné mais invalide.
 */
export function construireCorpsCreationConteneurDepuisEtat(
  etat: EtatCreationConteneurLab,
): Record<string, unknown> {
  const corps: Record<string, unknown> = {};
  const supplementTop = etat.jsonCorpsSupplementaireTop.trim();
  if (supplementTop.length > 0) {
    let parseTop: unknown;
    try {
      parseTop = JSON.parse(supplementTop) as unknown;
    } catch {
      throw new Error(
        "Le JSON supplémentaire au corps (racine) n’est pas un JSON valide.",
      );
    }
    if (
      parseTop !== null &&
      typeof parseTop === "object" &&
      !Array.isArray(parseTop)
    ) {
      Object.assign(corps, parseTop as Record<string, unknown>);
    }
  }
  delete corps.image;
  delete corps.imageCatalogId;
  delete corps.imageReference;
  if (etat.origineImage === "registre") {
    const refRegistre = etat.referenceDockerRegistre.trim();
    if (refRegistre.length === 0) {
      throw new Error(
        "Indiquez une référence Docker (ex. nginx:alpine ou docker.io/bitnami/nginx) lorsque vous choisissez une image hors catalogue.",
      );
    }
    corps.imageReference = refRegistre;
  } else {
    const idCatalogue = etat.imageCatalogId.trim();
    if (idCatalogue.length === 0) {
      throw new Error("Choisissez une image dans le catalogue ou passez par la référence Docker libre.");
    }
    corps.imageCatalogId = idCatalogue;
  }
  const nom = etat.nom.trim();
  if (nom.length > 0) {
    corps.name = nom;
  }
  const cmd = lignesNonVides(etat.cmdLignes);
  if (cmd.length > 0) {
    corps.cmd = cmd;
  }
  const entrypoint = lignesNonVides(etat.entrypointLignes);
  if (entrypoint.length > 0) {
    corps.entrypoint = entrypoint;
  }
  const wd = etat.repertoireTravail.trim();
  if (wd.length > 0) {
    corps.workingDir = wd;
  }
  const user = etat.utilisateur.trim();
  if (user.length > 0) {
    corps.user = user;
  }
  const hostname = etat.nomHote.trim();
  if (hostname.length > 0) {
    corps.hostname = hostname;
  }
  const domaine = etat.domaineConteneur.trim();
  if (domaine.length > 0) {
    corps.domainname = domaine;
  }
  const mac = etat.adresseMac.trim();
  if (mac.length > 0) {
    corps.macAddress = mac;
  }
  const signalArret = etat.signalArret.trim();
  if (signalArret.length > 0) {
    corps.stopSignal = signalArret;
  }
  const plateforme = etat.platformeDocker.trim();
  if (plateforme.length > 0) {
    corps.platform = plateforme;
  }
  const delaiArret = etat.delaiArretSecondes.trim();
  if (delaiArret.length > 0) {
    const secondes = Number(delaiArret);
    if (Number.isFinite(secondes) && secondes >= 0 && secondes <= 3600) {
      corps.stopTimeout = Math.round(secondes);
    }
  }
  if (etat.desactiverReseauConteneur) {
    corps.networkDisabled = true;
  }
  if (etat.attacherStdin) {
    corps.attachStdin = true;
  }
  if (etat.attacherStdout) {
    corps.attachStdout = true;
  }
  if (etat.attacherStderr) {
    corps.attachStderr = true;
  }
  if (etat.stdinUneFois) {
    corps.stdinOnce = true;
  }
  const env = lignesCleValeurVersObjet(etat.variablesEnvironnement);
  if (env) {
    corps.env = env;
  }
  const labels = lignesCleValeurVersObjet(etat.etiquettes);
  if (labels) {
    corps.labels = labels;
  }
  if (etat.tty) {
    corps.tty = true;
  }
  if (etat.entreeStandardOuverte) {
    corps.openStdin = true;
  }

  const { exposedPorts, portBindings } = liaisonsPortsDepuisTexte(
    etat.liaisonPortsTexte,
  );
  if (exposedPorts) {
    corps.exposedPorts = exposedPorts;
  }

  const binds = lignesNonVides(etat.montagesBinds);
  const dns = listeSepareeVirgules(etat.dnsListe);
  const dnsSearch = listeSepareeVirgules(etat.rechercheDns);
  const dnsOptions = listeSepareeVirgules(etat.optionsDns);
  const extraHosts = listeSepareeVirgules(etat.hotesSupplementaires);
  const capAdd = listeSepareeVirgules(etat.capacitesAjout);
  const capDrop = listeSepareeVirgules(etat.capacitesRetrait);
  const securityOpts = listeSepareeVirgules(etat.optionsSecurite);

  const memoire = etat.memoireMegaOctets.trim();
  const memoireNombre = memoire.length > 0 ? Number(memoire) : Number.NaN;
  const nano = etat.nanoCpus.trim();
  const nanoNombre = nano.length > 0 ? Number(nano) : Number.NaN;

  const hostConfig: Record<string, unknown> = {};
  if (portBindings) {
    hostConfig.portBindings = portBindings;
  }
  if (binds.length > 0) {
    hostConfig.binds = binds;
  }
  if (etat.politiqueRedemarrage !== "") {
    const politique: Record<string, unknown> = {
      name: etat.politiqueRedemarrage,
    };
    if (etat.politiqueRedemarrage === "on-failure") {
      const max = Number(etat.tentativesMaxOnFailure);
      if (Number.isFinite(max) && max >= 0) {
        politique.maximumRetryCount = max;
      }
    }
    hostConfig.restartPolicy = politique;
  }
  const modeReseau = etat.modeReseau.trim();
  if (modeReseau.length > 0) {
    hostConfig.networkMode = modeReseau;
  }
  if (dns) {
    hostConfig.dns = dns;
  }
  if (dnsSearch) {
    hostConfig.dnsSearch = dnsSearch;
  }
  if (dnsOptions) {
    hostConfig.dnsOptions = dnsOptions;
  }
  if (extraHosts) {
    hostConfig.extraHosts = extraHosts;
  }
  const modeIpc = etat.modeIpc.trim();
  if (modeIpc.length > 0) {
    hostConfig.ipcMode = modeIpc;
  }
  const modePid = etat.modePid.trim();
  if (modePid.length > 0) {
    hostConfig.pidMode = modePid;
  }
  const modeUts = etat.modeUts.trim();
  if (modeUts.length > 0) {
    hostConfig.utsMode = modeUts;
  }
  const modeUserns = etat.modeUserns.trim();
  if (modeUserns.length > 0) {
    hostConfig.usernsMode = modeUserns;
  }
  if (etat.cgroupnsMode !== "") {
    hostConfig.cgroupnsMode = etat.cgroupnsMode;
  }
  const runtime = etat.runtimeConteneur.trim();
  if (runtime.length > 0) {
    hostConfig.runtime = runtime;
  }
  const memoireReservee = etat.memoireReservationMegaOctets.trim();
  if (memoireReservee.length > 0) {
    const mega = Number(memoireReservee);
    if (Number.isFinite(mega) && mega > 0) {
      hostConfig.memoryReservationBytes = Math.round(mega * 1024 * 1024);
    }
  }
  const memoireSwap = etat.memoireSwapMegaOctets.trim();
  if (memoireSwap.length > 0) {
    const megaSwap = Number(memoireSwap);
    if (Number.isFinite(megaSwap)) {
      if (megaSwap === -1) {
        hostConfig.memorySwapBytes = -1;
      } else if (megaSwap > 0) {
        hostConfig.memorySwapBytes = Math.round(megaSwap * 1024 * 1024);
      }
    }
  }
  const swappinessTexte = etat.swappiness.trim();
  if (swappinessTexte.length > 0) {
    const sw = Number(swappinessTexte);
    if (Number.isFinite(sw) && sw >= -1 && sw <= 100) {
      hostConfig.memorySwappiness = sw;
    }
  }
  if (etat.oomKillDesactive) {
    hostConfig.oomKillDisable = true;
  }
  const oomAdj = etat.oomScoreAdj.trim();
  if (oomAdj.length > 0) {
    const adj = Number(oomAdj);
    if (Number.isFinite(adj) && adj >= -1000 && adj <= 1000) {
      hostConfig.oomScoreAdj = Math.round(adj);
    }
  }
  const blkio = etat.blkioWeight.trim();
  if (blkio.length > 0) {
    const poids = Number(blkio);
    if (Number.isFinite(poids) && poids >= 10 && poids <= 1000) {
      hostConfig.blkioWeight = Math.round(poids);
    }
  }
  const cgroupParent = etat.cgroupParent.trim();
  if (cgroupParent.length > 0) {
    hostConfig.cgroupParent = cgroupParent;
  }
  const piloteVolume = etat.piloteVolume.trim();
  if (piloteVolume.length > 0) {
    hostConfig.volumeDriver = piloteVolume;
  }
  const volumesFrom = lignesNonVides(etat.volumesFromLignes);
  if (volumesFrom.length > 0) {
    hostConfig.volumesFrom = volumesFrom;
  }
  const reglesCgroup = lignesNonVides(etat.deviceCgroupRulesLignes);
  if (reglesCgroup.length > 0) {
    hostConfig.deviceCgroupRules = reglesCgroup;
  }
  const consoleH = etat.consoleHauteur.trim();
  const consoleL = etat.consoleLargeur.trim();
  if (consoleH.length > 0 && consoleL.length > 0) {
    const h = Number(consoleH);
    const w = Number(consoleL);
    if (Number.isFinite(h) && Number.isFinite(w) && h >= 0 && w >= 0) {
      hostConfig.consoleSize = [Math.round(h), Math.round(w)];
    }
  }
  if (capAdd) {
    hostConfig.capAdd = capAdd;
  }
  if (capDrop) {
    hostConfig.capDrop = capDrop;
  }
  if (securityOpts) {
    hostConfig.securityOpts = securityOpts;
  }
  if (etat.privileged) {
    hostConfig.privileged = true;
  }
  if (etat.racineLectureSeule) {
    hostConfig.readonlyRootfs = true;
  }
  if (etat.publierTousLesPorts) {
    hostConfig.publishAllPorts = true;
  }
  if (Number.isFinite(memoireNombre) && memoireNombre > 0) {
    hostConfig.memoryBytes = Math.round(memoireNombre * 1024 * 1024);
  }
  if (Number.isFinite(nanoNombre) && nanoNombre > 0) {
    hostConfig.nanoCpus = Math.round(nanoNombre);
  }

  let jsonHostExtra: Record<string, unknown> | undefined;
  const brutHost = etat.jsonHostConfigExtra.trim();
  if (brutHost.length > 0) {
    const parse = JSON.parse(brutHost) as unknown;
    if (parse === null || typeof parse !== "object" || Array.isArray(parse)) {
      throw new Error(
        "Le JSON « hostConfig additionnel » doit être un objet JSON.",
      );
    }
    jsonHostExtra = parse as Record<string, unknown>;
  }

  const hostFusionne = fusionObjetsEnregistrements(
    hostConfig,
    jsonHostExtra,
  );
  if (hostFusionne && Object.keys(hostFusionne).length > 0) {
    corps.hostConfig = hostFusionne;
  }

  const brutReseau = etat.jsonConfigurationReseau.trim();
  if (brutReseau.length > 0) {
    const parseReseau = JSON.parse(brutReseau) as unknown;
    if (parseReseau === null || typeof parseReseau !== "object") {
      throw new Error(
        "Le JSON « networkingConfig » doit être un objet JSON (ex. endpointsConfig).",
      );
    }
    corps.networkingConfig = parseReseau as Record<string, unknown>;
  }

  const brutSante = etat.jsonHealthcheck.trim();
  if (brutSante.length > 0) {
    const parseSante = JSON.parse(brutSante) as unknown;
    if (parseSante === null || typeof parseSante !== "object") {
      throw new Error("Le JSON « healthcheck » doit être un objet JSON.");
    }
    corps.healthcheck = parseSante as Record<string, unknown>;
  }

  return corps;
}
