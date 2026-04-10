import { z } from "zod";

/** Schéma d’une liaison hôte pour un port conteneur (ex. `80/tcp`). */
const portBindingSchema = z.object({
  hostIp: z.string().optional(),
  hostPort: z.string().min(1),
});

/** Schéma de la configuration hôte transmise dans le corps de création. */
const hostConfigBodySchema = z.object({
  memoryBytes: z.number().int().positive().optional(),
  nanoCpus: z.number().int().positive().optional(),
  portBindings: z.record(z.string(), z.array(portBindingSchema)).optional(),
  autoRemove: z.boolean().optional(),
  binds: z.array(z.string()).optional(),
});

/** Corps JSON pour `POST /containers` (création), aligné sur `ContainerCreateSpec`. */
export const createContainerJsonSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  image: z.string().min(1),
  cmd: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  labels: z.record(z.string(), z.string()).optional(),
  exposedPorts: z.array(z.string().min(1)).optional(),
  hostConfig: hostConfigBodySchema.optional(),
  openStdin: z.boolean().optional(),
  tty: z.boolean().optional(),
});

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

export type CreateContainerJson = z.infer<typeof createContainerJsonSchema>;
