/** État du formulaire avancé de création de conteneur (laboratoire passerelle). */
export type EtatCreationConteneurLab = {
  image: string;
  nom: string;
  cmdLignes: string;
  entrypointLignes: string;
  repertoireTravail: string;
  utilisateur: string;
  nomHote: string;
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
  };
}
