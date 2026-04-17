/** État du formulaire avancé de création de conteneur (laboratoire passerelle). */
export type EtatCreationConteneurLab = {
  image: string;
  nom: string;
  cmdLignes: string;
  entrypointLignes: string;
  repertoireTravail: string;
  utilisateur: string;
  nomHote: string;
  domaineConteneur: string;
  adresseMac: string;
  signalArret: string;
  rechercheDns: string;
  optionsDns: string;
  modeIpc: string;
  modePid: string;
  modeUts: string;
  modeUserns: string;
  cgroupnsMode: "" | "private" | "host";
  runtimeConteneur: string;
  memoireReservationMegaOctets: string;
  memoireSwapMegaOctets: string;
  swappiness: string;
  oomKillDesactive: boolean;
  oomScoreAdj: string;
  blkioWeight: string;
  cgroupParent: string;
  piloteVolume: string;
  volumesFromLignes: string;
  deviceCgroupRulesLignes: string;
  consoleHauteur: string;
  consoleLargeur: string;
  platformeDocker: string;
  delaiArretSecondes: string;
  desactiverReseauConteneur: boolean;
  attacherStdin: boolean;
  attacherStdout: boolean;
  attacherStderr: boolean;
  stdinUneFois: boolean;
  politiqueRedemarrage: "" | "no" | "always" | "on-failure" | "unless-stopped";
  tentativesMaxOnFailure: string;
  modeReseau: string;
  liaisonPortsTexte: string;
  variablesEnvironnement: string;
  etiquettes: string;
  montagesBinds: string;
  dnsListe: string;
  hotesSupplementaires: string;
  capacitesAjout: string;
  capacitesRetrait: string;
  optionsSecurite: string;
  privileged: boolean;
  racineLectureSeule: boolean;
  publierTousLesPorts: boolean;
  tty: boolean;
  entreeStandardOuverte: boolean;
  memoireMegaOctets: string;
  nanoCpus: string;
  jsonHealthcheck: string;
  jsonConfigurationReseau: string;
  jsonHostConfigExtra: string;
  /**
   * Champs de premier niveau du corps `POST /containers` non couverts par les contrôles du formulaire,
   * conservés en JSON pour les configurations sauvegardées (ex. volumes, onBuild, shell).
   */
  jsonCorpsSupplementaireTop: string;
};

/** Valeurs initiales du formulaire de création (laboratoire). */
export function etatInitialCreationConteneurLab(): EtatCreationConteneurLab {
  return {
    image: "nginx:alpine",
    nom: "",
    cmdLignes: "",
    entrypointLignes: "",
    repertoireTravail: "",
    utilisateur: "",
    nomHote: "",
    domaineConteneur: "",
    adresseMac: "",
    signalArret: "",
    rechercheDns: "",
    optionsDns: "",
    modeIpc: "",
    modePid: "",
    modeUts: "",
    modeUserns: "",
    cgroupnsMode: "",
    runtimeConteneur: "",
    memoireReservationMegaOctets: "",
    memoireSwapMegaOctets: "",
    swappiness: "",
    oomKillDesactive: false,
    oomScoreAdj: "",
    blkioWeight: "",
    cgroupParent: "",
    piloteVolume: "",
    volumesFromLignes: "",
    deviceCgroupRulesLignes: "",
    consoleHauteur: "",
    consoleLargeur: "",
    platformeDocker: "",
    delaiArretSecondes: "",
    desactiverReseauConteneur: false,
    attacherStdin: false,
    attacherStdout: false,
    attacherStderr: false,
    stdinUneFois: false,
    politiqueRedemarrage: "",
    tentativesMaxOnFailure: "0",
    modeReseau: "",
    liaisonPortsTexte: "",
    variablesEnvironnement: "",
    etiquettes: "",
    montagesBinds: "",
    dnsListe: "",
    hotesSupplementaires: "",
    capacitesAjout: "",
    capacitesRetrait: "",
    optionsSecurite: "",
    privileged: false,
    racineLectureSeule: false,
    publierTousLesPorts: false,
    tty: false,
    entreeStandardOuverte: false,
    memoireMegaOctets: "",
    nanoCpus: "",
    jsonHealthcheck: "",
    jsonConfigurationReseau: "",
    jsonHostConfigExtra: "",
    jsonCorpsSupplementaireTop: "",
  };
}
