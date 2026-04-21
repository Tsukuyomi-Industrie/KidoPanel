import type { ImageCatalogId } from "./images-officielles.js";
import type { ChampGabaritDockerRapide } from "./gabarits-docker-rapide.js";
import {
  CHAMPS_FORMULAIRE_ARK,
  CHAMPS_FORMULAIRE_CS2,
  CHAMPS_FORMULAIRE_MINECRAFT_BEDROCK,
  CHAMPS_FORMULAIRE_MINECRAFT_JAVA,
  CHAMPS_FORMULAIRE_SATISFACTORY,
  CHAMPS_FORMULAIRE_TERRARIA,
  CHAMPS_FORMULAIRE_VALHEIM,
} from "./champs-formulaire-jeux-catalogue.js";

/** Gabarit jeu aligné sur la feuille de route PaaS : métadonnées UX et contraintes d'environnement exposées au panel. */
export type GabaritJeuCatalogueInstance = {
  id: string;
  name: string;
  description: string;
  imageCatalogId: ImageCatalogId;
  category: "game";
  requiredEnv: readonly string[];
  optionalEnv: readonly string[];
  defaultPorts: readonly number[];
  defaultMemoryMb: number;
  defaultCpuCores: number;
  installTimeEstimateSeconds: number;
  /** Champs formulaire métiers (sans exposer les noms Docker bruts à l'utilisateur dans l'interface). */
  champsFormulaire: readonly ChampGabaritDockerRapide[];
  /** Symbole ou pictogramme affiché sur la carte de sélection. */
  iconeRepresentation: string;
  /** Libellé court de famille de jeu pour le badge visuel. */
  etiquetteBadgeUx: string;
  /** Espace disque suggéré pour la création (Go). */
  disqueParDefautGb: number;
  /**
   * Stratégie d’interaction privilégiée pour les commandes : shell Docker, RCON jeu, client SQL ou journaux seuls.
   * Indicateur UX ; l’API `exec` shell reste disponible lorsque le gabarit l’autorise côté image.
   */
  modeConsolePrefere?: "shell" | "rcon" | "client_sql" | "journaux";
};

/**
 * Gabarits prêts pour une création orchestrée via `server-service` (sans saisie libre d'image hors catalogue).
 */
export const LISTE_GABARITS_JEU_INSTANCE: readonly GabaritJeuCatalogueInstance[] = [
  {
    id: "tmpl-jeu-minecraft-java",
    name: "Minecraft Java",
    description:
      "Serveur Minecraft Java (Docker itzg/minecraft-server) avec chargement JVM adapté.",
    imageCatalogId: "jeu-minecraft-java",
    category: "game",
    requiredEnv: [],
    optionalEnv: [
      "SERVER_NAME",
      "DIFFICULTY",
      "MODE",
      "MEMORY",
      "OPS",
      "VERSION",
      "MAX_PLAYERS",
    ],
    defaultPorts: [25565],
    defaultMemoryMb: 3072,
    defaultCpuCores: 2,
    installTimeEstimateSeconds: 180,
    champsFormulaire: CHAMPS_FORMULAIRE_MINECRAFT_JAVA,
    iconeRepresentation: "⛏",
    etiquetteBadgeUx: "Sandbox",
    disqueParDefautGb: 20,
    modeConsolePrefere: "shell",
  },
  {
    id: "tmpl-jeu-minecraft-bedrock",
    name: "Minecraft Bedrock",
    description:
      "Serveur Minecraft Bedrock pour clients multiplateformes (image itzg dédiée).",
    imageCatalogId: "jeu-minecraft-bedrock",
    category: "game",
    requiredEnv: [],
    optionalEnv: ["SERVER_NAME", "GAMEMODE", "DIFFICULTY"],
    defaultPorts: [19132],
    defaultMemoryMb: 1024,
    defaultCpuCores: 1,
    installTimeEstimateSeconds: 120,
    champsFormulaire: CHAMPS_FORMULAIRE_MINECRAFT_BEDROCK,
    iconeRepresentation: "🧱",
    etiquetteBadgeUx: "Sandbox",
    disqueParDefautGb: 12,
    modeConsolePrefere: "shell",
  },
  {
    id: "tmpl-jeu-valheim",
    name: "Valheim",
    description:
      "Monde Valheim dédié ; prévoir nom du monde et mot de passe serveur.",
    imageCatalogId: "jeu-valheim",
    category: "game",
    requiredEnv: ["SERVER_PASS", "SERVER_NAME"],
    optionalEnv: ["WORLD_NAME", "PUBLIC"],
    defaultPorts: [2456, 2457, 2458],
    defaultMemoryMb: 4096,
    defaultCpuCores: 2,
    installTimeEstimateSeconds: 240,
    champsFormulaire: CHAMPS_FORMULAIRE_VALHEIM,
    iconeRepresentation: "🛡",
    etiquetteBadgeUx: "Survie",
    disqueParDefautGb: 25,
    modeConsolePrefere: "shell",
  },
  {
    id: "tmpl-jeu-terraria",
    name: "Terraria",
    description: "Serveur Terraria ; configurer mot de passe et slots selon l'image.",
    imageCatalogId: "jeu-terraria",
    category: "game",
    requiredEnv: [],
    optionalEnv: ["WORLD_NAME", "MAX_PLAYERS", "PASSWORD"],
    defaultPorts: [7777],
    defaultMemoryMb: 1024,
    defaultCpuCores: 1,
    installTimeEstimateSeconds: 90,
    champsFormulaire: CHAMPS_FORMULAIRE_TERRARIA,
    iconeRepresentation: "🌿",
    etiquetteBadgeUx: "Aventure",
    disqueParDefautGb: 8,
    modeConsolePrefere: "shell",
  },
  {
    id: "tmpl-jeu-satisfactory",
    name: "Satisfactory",
    description:
      "Serveur Satisfactory ; temps de premier démarrage et espace disque importants.",
    imageCatalogId: "jeu-satisfactory",
    category: "game",
    requiredEnv: [],
    optionalEnv: ["MAXPLAYERS", "STEAMCMD_ARGS"],
    defaultPorts: [7777, 15000, 15777],
    defaultMemoryMb: 8192,
    defaultCpuCores: 4,
    installTimeEstimateSeconds: 600,
    champsFormulaire: CHAMPS_FORMULAIRE_SATISFACTORY,
    iconeRepresentation: "🏭",
    etiquetteBadgeUx: "Usine",
    disqueParDefautGb: 40,
    modeConsolePrefere: "shell",
  },
  {
    id: "tmpl-jeu-cs2",
    name: "Counter-Strike 2",
    description:
      "Serveur CS2 ; tokens Steam et configuration dédiée selon la documentation joedwards32/cs2.",
    imageCatalogId: "jeu-cs2",
    category: "game",
    requiredEnv: ["STEAMUSER", "STEAMPASS"],
    optionalEnv: ["CS2_ARGS", "TICKRATE"],
    defaultPorts: [27015, 27020],
    defaultMemoryMb: 4096,
    defaultCpuCores: 3,
    installTimeEstimateSeconds: 900,
    champsFormulaire: CHAMPS_FORMULAIRE_CS2,
    iconeRepresentation: "🎯",
    etiquetteBadgeUx: "Tir",
    disqueParDefautGb: 35,
    modeConsolePrefere: "shell",
  },
  {
    id: "tmpl-jeu-ark",
    name: "ARK Survival Evolved",
    description:
      "Serveur ARK ; valider l'image Docker choisie sur votre hôte avant production.",
    imageCatalogId: "jeu-ark",
    category: "game",
    requiredEnv: ["SESSION_NAME"],
    optionalEnv: ["SERVER_MAP", "SERVER_PASSWORD"],
    defaultPorts: [7777, 27015, 32330],
    defaultMemoryMb: 8192,
    defaultCpuCores: 4,
    installTimeEstimateSeconds: 1200,
    champsFormulaire: CHAMPS_FORMULAIRE_ARK,
    iconeRepresentation: "🦖",
    etiquetteBadgeUx: "Survie",
    disqueParDefautGb: 50,
    modeConsolePrefere: "shell",
  },
  {
    id: "tmpl-jeu-personnalise",
    name: "Serveur personnalisé",
    description:
      "Quotas réservés sans gabarit jeu prédéfini ; l'image Docker effective doit être alignée sur votre déploiement réel.",
    imageCatalogId: "jeu-personnalise",
    category: "game",
    requiredEnv: [],
    optionalEnv: [],
    defaultPorts: [],
    defaultMemoryMb: 2048,
    defaultCpuCores: 1,
    installTimeEstimateSeconds: 120,
    champsFormulaire: [],
    iconeRepresentation: "✎",
    etiquetteBadgeUx: "Personnalisé",
    disqueParDefautGb: 10,
    modeConsolePrefere: "shell",
  },
];

const indexGabaritsJeu = new Map<string, GabaritJeuCatalogueInstance>(
  LISTE_GABARITS_JEU_INSTANCE.map((g) => [g.id, g]),
);

/** Liste immuable pour les réponses HTTP et le service serveur. */
export function listeGabaritsJeuCatalogue(): readonly GabaritJeuCatalogueInstance[] {
  return LISTE_GABARITS_JEU_INSTANCE;
}

/** Résout un gabarit jeu par identifiant pour validation ou composition Docker. */
export function trouverGabaritJeuParId(
  identifiant: string,
): GabaritJeuCatalogueInstance | undefined {
  return indexGabaritsJeu.get(identifiant.trim());
}
