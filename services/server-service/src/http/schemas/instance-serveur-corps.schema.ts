import { z } from "zod";

/** Liste des valeurs Prisma GameType synchronisées avec `schema.prisma`. */
const valeursGameTypeSchema = [
  "MINECRAFT_JAVA",
  "MINECRAFT_BEDROCK",
  "VALHEIM",
  "TERRARIA",
  "SATISFACTORY",
  "ARK",
  "CSGO",
  "CUSTOM",
] as const;

/** Corps de création d’une instance jeu : quotas et variables d’environnement métier (nom conteneur dérivé côté serveur). */
export const corpsCreationInstanceServeurJeuxSchema = z.object({
  name: z.string().min(1).max(255),
  gameType: z.enum(valeursGameTypeSchema),
  memoryMb: z.number().int().positive().max(524_288),
  cpuCores: z.number().positive().max(512),
  diskGb: z.number().int().positive().max(10_000),
  env: z.record(z.string(), z.string()).optional(),
  /** Identifiant d’un pont créé via la passerelle (`GET /reseaux-internes`) pour isoler le conteneur sur ce réseau. */
  reseauInterneUtilisateurId: z.string().uuid().optional(),
  /** Avec `reseauInterneUtilisateurId` : aussi rattacher le conteneur au réseau partagé `kidopanel-network`. */
  attacherReseauKidopanelComplement: z.boolean().optional(),
  /** Si le double réseau est actif : le réseau principal à la création est `kidopanel-network` (défaut `true`). */
  reseauPrimaireKidopanel: z.boolean().optional(),
})
  .superRefine((donnees, ctx) => {
    if (donnees.attacherReseauKidopanelComplement === true) {
      const id = donnees.reseauInterneUtilisateurId?.trim();
      if (id === undefined || id.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Le double réseau impose « reseauInterneUtilisateurId » (pont créé depuis le panel).",
          path: ["reseauInterneUtilisateurId"],
        });
      }
    }
  });
