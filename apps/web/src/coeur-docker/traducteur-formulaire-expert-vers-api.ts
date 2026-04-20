import type { EtatFormulaireExpertConteneur } from "./etat-formulaire-expert-conteneur.js";

function extraireEnvDepuisFormulaire(etat: EtatFormulaireExpertConteneur): Record<string, string> {
  const env: Record<string, string> = {};
  for (const ligne of etat.lignesEnv) {
    const cle = ligne.cle.trim();
    if (cle.length === 0) {
      continue;
    }
    env[cle] = ligne.valeur;
  }
  return env;
}

function extrairePortsDepuisFormulaire(etat: EtatFormulaireExpertConteneur): {
  exposedPorts: string[];
  portBindings: Record<string, Array<{ hostIp: string; hostPort: string }>>;
} {
  const exposedPorts: string[] = [];
  const portBindings: Record<string, Array<{ hostIp: string; hostPort: string }>> = {};
  for (const ligne of etat.lignesPorts) {
    const pc = ligne.portConteneur.trim();
    const ph = ligne.portHote.trim();
    if (pc.length === 0 || ph.length === 0) {
      continue;
    }
    const clePort = `${pc}/${ligne.protocole}`;
    exposedPorts.push(clePort);
    portBindings[clePort] = [{ hostIp: "", hostPort: ph }];
  }
  return { exposedPorts, portBindings };
}

function extraireBindsDepuisFormulaire(etat: EtatFormulaireExpertConteneur): string[] {
  const binds: string[] = [];
  for (const ligne of etat.lignesVolumes) {
    const h = ligne.cheminHote.trim();
    const c = ligne.cheminConteneur.trim();
    if (h.length === 0 || c.length === 0) {
      continue;
    }
    binds.push(`${h}:${c}`);
  }
  return binds;
}

function extraireSysctlsDepuisFormulaire(
  etat: EtatFormulaireExpertConteneur,
): Record<string, string> {
  const sysctls: Record<string, string> = {};
  for (const ligne of etat.lignesSysctl) {
    const cle = ligne.cle.trim();
    if (cle.length === 0) {
      continue;
    }
    sysctls[cle] = ligne.valeur;
  }
  return sysctls;
}

function appliquerStrategieReseauPontUtilisateur(
  etat: EtatFormulaireExpertConteneur,
  corps: Record<string, unknown>,
): void {
  if (etat.modeReseau !== "bridge") {
    return;
  }
  const nd = etat.nomDockerPontUtilisateur.trim();
  if (etat.strategieReseauKidoPanel === "pont_utilisateur_seul") {
    if (nd.length === 0) {
      throw new Error(
        "Choisissez un pont dans la liste ou la stratégie « Réseau KidoPanel uniquement ».",
      );
    }
    corps.reseauBridgeNom = nd;
    return;
  }
  if (etat.strategieReseauKidoPanel === "kidopanel_et_pont") {
    if (nd.length === 0) {
      throw new Error(
        "Pour le double réseau, sélectionnez un pont utilisateur créé depuis le panel.",
      );
    }
    corps.reseauBridgeNom = nd;
    corps.reseauDualAvecKidopanel = true;
    if (!etat.primaireReseauKidopanelEnDouble) {
      corps.reseauPrimaireKidopanel = false;
    }
  }
}

/**
 * Transforme l'état du formulaire expert structuré en corps `POST /containers`
 * pour le moteur de conteneurs (aucune chaîne JSON saisie par l'utilisateur).
 */
export function traduireFormulaireExpertVersCorpsApi(
  etat: EtatFormulaireExpertConteneur,
): Record<string, unknown> {
  const nom = etat.nomContainer.trim();
  const referenceImage = etat.imageDocker.trim();
  if (nom.length === 0) {
    throw new Error("Le nom du container est obligatoire.");
  }
  if (referenceImage.length === 0) {
    throw new Error("La référence d'image Docker est obligatoire.");
  }

  const env = extraireEnvDepuisFormulaire(etat);
  const { exposedPorts, portBindings } = extrairePortsDepuisFormulaire(etat);
  const binds = extraireBindsDepuisFormulaire(etat);
  const sysctls = extraireSysctlsDepuisFormulaire(etat);

  const hostConfig: Record<string, unknown> = {
    memoryBytes: Math.round(etat.memoireMo) * 1024 * 1024,
    nanoCpus: Math.round(etat.cpuCoeurs * 1e9),
    restartPolicy: {
      name: etat.politiqueRedemarrage,
    },
    networkMode: etat.modeReseau,
  };

  if (exposedPorts.length > 0) {
    hostConfig.portBindings = portBindings;
  }
  if (binds.length > 0) {
    hostConfig.binds = binds;
  }
  if (etat.modePrivilegie) {
    hostConfig.privileged = true;
  }
  const pidLim = etat.limitePid.trim();
  if (pidLim.length > 0) {
    const n = Number(pidLim);
    if (!Number.isNaN(n) && n > 0) {
      hostConfig.pidsLimit = n;
    }
  }
  if (Object.keys(sysctls).length > 0) {
    hostConfig.sysctls = sysctls;
  }

  const corps: Record<string, unknown> = {
    name: nom,
    imageReference: referenceImage,
    hostConfig,
  };

  if (exposedPorts.length > 0) {
    corps.exposedPorts = exposedPorts;
  }
  if (Object.keys(env).length > 0) {
    corps.env = env;
  }

  const epBrut = etat.entrypointDocker.trim();
  if (epBrut.length > 0) {
    corps.entrypoint = epBrut.split(/\s+/).filter((t) => t.length > 0);
  }

  const cmdBrut = etat.commandeDemarrage.trim();
  if (cmdBrut.length > 0) {
    corps.cmd = cmdBrut.split(/\s+/).filter((t) => t.length > 0);
  }

  const hostnameBrut = etat.nomHoteReseau.trim();
  if (hostnameBrut.length > 0) {
    corps.hostname = hostnameBrut;
  }

  const wd = etat.repertoireTravailDocker.trim();
  if (wd.length > 0) {
    corps.workingDir = wd;
  }

  appliquerStrategieReseauPontUtilisateur(etat, corps);

  return corps;
}
