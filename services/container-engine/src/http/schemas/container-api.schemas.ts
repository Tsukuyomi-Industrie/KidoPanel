import { z } from "zod";

export {
  createContainerJsonSchema,
  type CreateContainerJson,
} from "./creation-conteneur-corps.schema.js";

/** Paramètre de requête `all` pour lister aussi les conteneurs arrêtés. */
export const listContainersQuerySchema = z.object({
  all: z
    .string()
    .optional()
    .transform((value) =>
      value === undefined ? false : value === "true" || value === "1",
    ),
});

/** Identifiant ou nom de conteneur dans le chemin d’URL. */
export const containerIdParamSchema = z.object({
  id: z.string().min(1).max(512),
});

/** Options de lecture des journaux (nombre de lignes, horodatage). */
export const containerLogsQuerySchema = z.object({
  tail: z.coerce.number().int().positive().max(100_000).optional(),
  timestamps: z.coerce.boolean().optional(),
});

/** Indique si la suppression Docker doit forcer l’arrêt préalable. */
export const removeContainerQuerySchema = z.object({
  force: z.coerce.boolean().optional(),
});

/** Corps JSON optionnel pour fixer le délai d’arrêt gracieux (secondes). */
export const stopContainerJsonSchema = z.object({
  timeoutSeconds: z.number().int().min(1).max(300).optional(),
});

export {
  execConteneurCorpsSchema as execConteneurJsonSchema,
} from "@kidopanel/database";

