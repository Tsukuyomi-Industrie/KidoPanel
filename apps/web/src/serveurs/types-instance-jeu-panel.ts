/** Valeurs `gameType` alignées sur le schéma Prisma et le corps `POST /instances` du service jeu. */
export const VALEURS_TYPE_JEU_INSTANCE_PANEL = [
  "MINECRAFT_JAVA",
  "MINECRAFT_BEDROCK",
  "VALHEIM",
  "TERRARIA",
  "SATISFACTORY",
  "ARK",
  "CSGO",
  "CUSTOM",
] as const;

export type TypeJeuInstancePanel = (typeof VALEURS_TYPE_JEU_INSTANCE_PANEL)[number];
