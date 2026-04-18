import type { GabaritJeuCatalogueInstance } from "@kidopanel/container-catalog";
import type { CorpsCreationInstanceServeurJeux } from "../passerelle/serviceServeursJeuxPasserelle.js";
import type { TypeJeuInstancePanel } from "./types-instance-jeu-panel.js";

/** Stratégie d’attachement réseau pour la création d’instance jeu (pont KidoPanel et pont utilisateur). */
export type StrategieReseauCreationInstanceJeux =
  | "kidopanel_seul"
  | "pont_utilisateur_seul"
  | "kidopanel_et_pont_utilisateur";

export type OptionsReseauCreationInstanceJeux = {
  strategie: StrategieReseauCreationInstanceJeux;
  idReseauInterneUtilisateurSelectionne?: string;
  primaireKidopanel?: boolean;
};

function appliquerOptionsReseauAuCorpsInstanceJeux(
  corps: CorpsCreationInstanceServeurJeux,
  opts?: OptionsReseauCreationInstanceJeux,
): CorpsCreationInstanceServeurJeux {
  if (opts === undefined || opts.strategie === "kidopanel_seul") {
    return corps;
  }
  const id = opts.idReseauInterneUtilisateurSelectionne?.trim();
  if (id === undefined || id.length === 0) {
    throw new Error(
      "Choisissez un réseau dans la liste ou sélectionnez « Réseau KidoPanel uniquement ».",
    );
  }
  if (opts.strategie === "pont_utilisateur_seul") {
    return { ...corps, reseauInterneUtilisateurId: id };
  }
  return {
    ...corps,
    reseauInterneUtilisateurId: id,
    attacherReseauKidopanelComplement: true,
    ...(opts.primaireKidopanel === false ? { reseauPrimaireKidopanel: false } : {}),
  };
}

/** Corps minimal pour une instance jeu sans gabarit catalogue prédéfini. */
export function traduireServeurPersonnaliseVersCorpsApi(
  params: {
    nomServeur: string;
    memoryMb: number;
    cpuCores: number;
    diskGb: number;
  },
  optsReseau?: OptionsReseauCreationInstanceJeux,
): CorpsCreationInstanceServeurJeux {
  const base: CorpsCreationInstanceServeurJeux = {
    name: params.nomServeur.trim(),
    gameType: "CUSTOM",
    memoryMb: params.memoryMb,
    cpuCores: params.cpuCores,
    diskGb: params.diskGb,
    env: {},
  };
  return appliquerOptionsReseauAuCorpsInstanceJeux(base, optsReseau);
}

const IDENTIFIANT_GABARIT_VERS_TYPE_JEU: Record<string, TypeJeuInstancePanel> = {
  "tmpl-jeu-minecraft-java": "MINECRAFT_JAVA",
  "tmpl-jeu-minecraft-bedrock": "MINECRAFT_BEDROCK",
  "tmpl-jeu-valheim": "VALHEIM",
  "tmpl-jeu-terraria": "TERRARIA",
  "tmpl-jeu-satisfactory": "SATISFACTORY",
  "tmpl-jeu-cs2": "CSGO",
  "tmpl-jeu-ark": "ARK",
};

/**
 * Traduit les valeurs brutes du formulaire de création de serveur
 * en corps JSON attendu par POST /serveurs-jeux/instances.
 * Les clés NOM_CONTAINER et PORT_HOTE sont des méta-champs réservés au panel Docker
 * et ne sont pas transmises au service jeu.
 */
export function traduireValeursFormulaireVersCorpsApi(
  params: {
    gabarit: GabaritJeuCatalogueInstance;
    nomServeur: string;
    memoryMb: number;
    cpuCores: number;
    diskGb: number;
    valeursChamps: Record<string, string>;
  },
  optsReseau?: OptionsReseauCreationInstanceJeux,
): CorpsCreationInstanceServeurJeux {
  const CLES_META = new Set(["NOM_CONTAINER", "PORT_HOTE"]);

  const env: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(params.valeursChamps)) {
    if (!CLES_META.has(cle) && valeur.trim() !== "") {
      env[cle] = valeur.trim();
    }
  }

  if (params.gabarit.id === "tmpl-jeu-minecraft-java") {
    env.EULA = "TRUE";
  }

  const typeJeu = IDENTIFIANT_GABARIT_VERS_TYPE_JEU[params.gabarit.id];
  if (typeJeu === undefined) {
    throw new Error("Gabarit jeu sans correspondance de type Prisma.");
  }

  const base: CorpsCreationInstanceServeurJeux = {
    name: params.nomServeur.trim(),
    gameType: typeJeu,
    memoryMb: params.memoryMb,
    cpuCores: params.cpuCores,
    diskGb: params.diskGb,
    env,
  };
  return appliquerOptionsReseauAuCorpsInstanceJeux(base, optsReseau);
}
