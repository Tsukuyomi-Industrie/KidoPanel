/**
 * Schéma `hostConfig` complet pour l’export JSON des configurations (valeurs nulles ou vides = non utilisé).
 * Toute clé reconnue par l’API de création du moteur y figure pour permettre un réglage manuel dans un seul fichier.
 */
export function creerHostConfigJsonModeleComplet(): Record<string, unknown> {
  return {
    memoryBytes: null,
    nanoCpus: null,
    portBindings: {},
    autoRemove: false,
    binds: [],
    restartPolicy: null,
    networkMode: null,
    privileged: false,
    readonlyRootfs: false,
    publishAllPorts: false,
    dns: null,
    dnsSearch: null,
    dnsOptions: null,
    extraHosts: null,
    capAdd: null,
    capDrop: null,
    securityOpts: null,
    shmSizeBytes: null,
    tmpfs: null,
    ulimits: null,
    sysctls: null,
    groupAdd: null,
    init: null,
    cpuShares: null,
    cpuPeriod: null,
    cpuQuota: null,
    cpusetCpus: null,
    cpusetMems: null,
    pidsLimit: null,
    storageOpt: null,
    devices: null,
    logConfig: null,
    ipcMode: null,
    pidMode: null,
    utsMode: null,
    usernsMode: null,
    cgroupnsMode: null,
    runtime: null,
    mounts: null,
    memoryReservationBytes: null,
    memorySwapBytes: null,
    memorySwappiness: null,
    oomKillDisable: false,
    oomScoreAdj: null,
    blkioWeight: null,
    cgroupParent: null,
    volumeDriver: null,
    volumesFrom: null,
    deviceCgroupRules: null,
    consoleSize: null,
  };
}

/**
 * Modèle de corps `POST /containers` avec toutes les clés connues du lab, pour export ou fusion.
 */
export function creerCorpsJsonModeleComplet(): Record<string, unknown> {
  return {
    image: "",
    name: null,
    cmd: null,
    entrypoint: null,
    workingDir: null,
    user: null,
    hostname: null,
    domainname: null,
    macAddress: null,
    stopSignal: null,
    env: {},
    labels: {},
    exposedPorts: null,
    hostConfig: creerHostConfigJsonModeleComplet(),
    networkingConfig: null,
    healthcheck: null,
    openStdin: false,
    tty: false,
    attachStdin: false,
    attachStdout: false,
    attachStderr: false,
    stdinOnce: false,
    platform: null,
    stopTimeout: null,
    networkDisabled: false,
    volumes: null,
    onBuild: null,
    shell: null,
  };
}

/**
 * Fusionne un modèle complet avec un corps partiel : les clés présentes dans `partiel` remplacent ou fusionnent
 * récursivement les objets imbriqués (ex. `hostConfig`).
 */
export function fusionnerModeleCorpsEtPartiel(
  modele: Record<string, unknown>,
  partiel: Record<string, unknown>,
): Record<string, unknown> {
  const sortie: Record<string, unknown> = { ...modele };
  for (const [cle, valeur] of Object.entries(partiel)) {
    if (valeur === undefined) {
      continue;
    }
    const baseVal = sortie[cle];
    if (
      valeur !== null &&
      typeof valeur === "object" &&
      !Array.isArray(valeur) &&
      baseVal !== null &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      sortie[cle] = fusionnerModeleCorpsEtPartiel(
        baseVal as Record<string, unknown>,
        valeur as Record<string, unknown>,
      );
    } else {
      sortie[cle] = valeur;
    }
  }
  return sortie;
}
