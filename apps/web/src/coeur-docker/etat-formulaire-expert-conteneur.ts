/** Ligne de publication de port pour le formulaire expert de création Docker. */
export type LignePortExpertConteneur = {
  id: string;
  portConteneur: string;
  portHote: string;
  protocole: "tcp" | "udp";
};

/** Paire clé / valeur pour les variables d'environnement du formulaire expert. */
export type LigneEnvExpertConteneur = {
  id: string;
  cle: string;
  valeur: string;
};

/** Montage bind hôte vers conteneur. */
export type LigneVolumeExpertConteneur = {
  id: string;
  cheminHote: string;
  cheminConteneur: string;
};

/** Paire sysctl pour les réglages noyau optionnels. */
export type LigneSysctlExpertConteneur = {
  id: string;
  cle: string;
  valeur: string;
};

/** Stratégie d’attachement aux ponts gérés par KidoPanel (mode `bridge` uniquement). */
export type StrategieReseauPanelKido = "kidopanel_seul" | "pont_utilisateur_seul" | "kidopanel_et_pont";

/** État initial du formulaire expert : sections repliables sans saisie JSON brute. */
export type EtatFormulaireExpertConteneur = {
  nomContainer: string;
  imageDocker: string;
  commandeDemarrage: string;
  repertoireTravailDocker: string;
  lignesPorts: LignePortExpertConteneur[];
  lignesEnv: LigneEnvExpertConteneur[];
  lignesVolumes: LigneVolumeExpertConteneur[];
  memoireMo: number;
  cpuCoeurs: number;
  politiqueRedemarrage: "no" | "always" | "on-failure" | "unless-stopped";
  modeReseau: "bridge" | "host" | "none";
  nomHoteReseau: string;
  strategieReseauKidoPanel: StrategieReseauPanelKido;
  nomDockerPontUtilisateur: string;
  primaireReseauKidopanelEnDouble: boolean;
  modePrivilegie: boolean;
  limitePid: string;
  lignesSysctl: LigneSysctlExpertConteneur[];
};

function genererIdLigne(): string {
  return `ligne-${String(Math.random()).slice(2, 11)}`;
}

/** Valeurs par défaut du formulaire expert à l'ouverture de la page. */
export function etatInitialFormulaireExpertConteneur(): EtatFormulaireExpertConteneur {
  return {
    nomContainer: "",
    imageDocker: "",
    commandeDemarrage: "",
    repertoireTravailDocker: "",
    lignesPorts: [],
    lignesEnv: [],
    lignesVolumes: [],
    memoireMo: 512,
    cpuCoeurs: 1,
    politiqueRedemarrage: "unless-stopped",
    modeReseau: "bridge",
    nomHoteReseau: "",
    strategieReseauKidoPanel: "kidopanel_seul",
    nomDockerPontUtilisateur: "",
    primaireReseauKidopanelEnDouble: true,
    modePrivilegie: false,
    limitePid: "",
    lignesSysctl: [],
  };
}

/** Ajoute une ligne de port vide éditable. */
export function ajouterLignePortExpert(
  etat: EtatFormulaireExpertConteneur,
): EtatFormulaireExpertConteneur {
  return {
    ...etat,
    lignesPorts: [
      ...etat.lignesPorts,
      {
        id: genererIdLigne(),
        portConteneur: "",
        portHote: "",
        protocole: "tcp",
      },
    ],
  };
}

/** Ajoute une paire variable d'environnement vide. */
export function ajouterLigneEnvExpert(
  etat: EtatFormulaireExpertConteneur,
): EtatFormulaireExpertConteneur {
  return {
    ...etat,
    lignesEnv: [
      ...etat.lignesEnv,
      { id: genererIdLigne(), cle: "", valeur: "" },
    ],
  };
}

/** Ajoute une ligne de volume bind. */
export function ajouterLigneVolumeExpert(
  etat: EtatFormulaireExpertConteneur,
): EtatFormulaireExpertConteneur {
  return {
    ...etat,
    lignesVolumes: [
      ...etat.lignesVolumes,
      { id: genererIdLigne(), cheminHote: "", cheminConteneur: "" },
    ],
  };
}

/** Ajoute une entrée sysctl vide. */
export function ajouterLigneSysctlExpert(
  etat: EtatFormulaireExpertConteneur,
): EtatFormulaireExpertConteneur {
  return {
    ...etat,
    lignesSysctl: [
      ...etat.lignesSysctl,
      { id: genererIdLigne(), cle: "", valeur: "" },
    ],
  };
}
