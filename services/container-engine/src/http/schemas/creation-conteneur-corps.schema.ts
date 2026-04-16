import { z } from "zod";

/** Schéma d’une liaison hôte pour un port conteneur (ex. `80/tcp`). */
const liaisonPortConteneurSchema = z.object({
  hostIp: z.string().optional(),
  hostPort: z.string().min(1),
});

/** Politique de redémarrage Docker (`HostConfig.RestartPolicy`). */
const politiqueRedemarrageSchema = z.object({
  name: z.enum(["no", "always", "on-failure", "unless-stopped"]),
  maximumRetryCount: z.number().int().min(0).max(100).optional(),
});

/** Limite de ressources type ulimit (`HostConfig.Ulimits`). */
const ulimitSchema = z.object({
  name: z.string().min(1).max(64),
  soft: z.number().int().min(-1).max(1_000_000_000),
  hard: z.number().int().min(-1).max(1_000_000_000),
});

/** Montage de périphérique (`HostConfig.Devices`). */
const peripheriqueSchema = z.object({
  pathOnHost: z.string().min(1).max(4096),
  pathInContainer: z.string().min(1).max(4096),
  cgroupPermissions: z.string().min(1).max(8).optional(),
});

/** Configuration des journaux du conteneur (`HostConfig.LogConfig`). */
const configurationJournauxSchema = z.object({
  type: z.string().min(1).max(64),
  config: z.record(z.string(), z.string()).optional(),
});

/** Test et délais du contrôle de santé (`Config.Healthcheck`). */
const healthcheckSchema = z.object({
  test: z.array(z.string()).min(1).max(32),
  intervalSeconds: z.number().min(0).max(86_400).optional(),
  timeoutSeconds: z.number().min(0).max(86_400).optional(),
  retries: z.number().int().min(0).max(100).optional(),
  startPeriodSeconds: z.number().min(0).max(86_400).optional(),
});

/** Point de terminaison réseau pour une création avec réseau nommé. */
const parametresPointReseauSchema = z.object({
  aliases: z.array(z.string().min(1).max(255)).max(64).optional(),
  ipv4Address: z.string().max(64).optional(),
  ipv6Address: z.string().max(128).optional(),
});

const configurationReseauCreationSchema = z.object({
  endpointsConfig: z
    .record(z.string().min(1).max(255), parametresPointReseauSchema)
    .optional(),
});

/** Schéma de la configuration hôte transmise dans le corps de création. */
const hostConfigCorpsSchema = z.object({
  memoryBytes: z.number().int().positive().optional(),
  nanoCpus: z.number().int().positive().optional(),
  portBindings: z.record(z.string(), z.array(liaisonPortConteneurSchema)).optional(),
  autoRemove: z.boolean().optional(),
  binds: z.array(z.string().min(1).max(8192)).max(256).optional(),
  restartPolicy: politiqueRedemarrageSchema.optional(),
  networkMode: z.string().min(1).max(256).optional(),
  privileged: z.boolean().optional(),
  readonlyRootfs: z.boolean().optional(),
  publishAllPorts: z.boolean().optional(),
  dns: z.array(z.string().min(1).max(253)).max(16).optional(),
  dnsSearch: z.array(z.string().min(1).max(253)).max(16).optional(),
  extraHosts: z.array(z.string().min(1).max(1024)).max(64).optional(),
  capAdd: z.array(z.string().min(1).max(64)).max(64).optional(),
  capDrop: z.array(z.string().min(1).max(64)).max(64).optional(),
  securityOpts: z.array(z.string().min(1).max(512)).max(32).optional(),
  shmSizeBytes: z.number().int().positive().optional(),
  tmpfs: z.record(z.string().min(1).max(4096), z.string().max(512)).optional(),
  ulimits: z.array(ulimitSchema).max(64).optional(),
  sysctls: z.record(z.string().min(1).max(256), z.string().max(512)).max(64).optional(),
  groupAdd: z.array(z.string().min(1).max(64)).max(64).optional(),
  init: z.boolean().optional(),
  cpuShares: z.number().int().positive().optional(),
  cpuPeriod: z.number().int().positive().optional(),
  cpuQuota: z.number().int().optional(),
  cpusetCpus: z.string().max(1024).optional(),
  cpusetMems: z.string().max(1024).optional(),
  pidsLimit: z.number().int().positive().optional(),
  storageOpt: z.record(z.string(), z.string()).optional(),
  devices: z.array(peripheriqueSchema).max(64).optional(),
  logConfig: configurationJournauxSchema.optional(),
});

/** Corps JSON pour `POST /containers` (création), aligné sur `ContainerCreateSpec`. */
export const createContainerJsonSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  image: z.string().min(1),
  cmd: z.array(z.string()).max(512).optional(),
  entrypoint: z.array(z.string()).max(64).optional(),
  workingDir: z.string().max(4096).optional(),
  user: z.string().max(256).optional(),
  hostname: z.string().max(253).optional(),
  domainname: z.string().max(253).optional(),
  macAddress: z.string().max(32).optional(),
  stopSignal: z.string().max(32).optional(),
  env: z.record(z.string().max(1024), z.string().max(65536)).optional(),
  labels: z.record(z.string().max(256), z.string().max(65536)).optional(),
  exposedPorts: z.array(z.string().min(1).max(64)).max(128).optional(),
  hostConfig: hostConfigCorpsSchema.optional(),
  networkingConfig: configurationReseauCreationSchema.optional(),
  healthcheck: healthcheckSchema.optional(),
  openStdin: z.boolean().optional(),
  tty: z.boolean().optional(),
});

export type CreateContainerJson = z.infer<typeof createContainerJsonSchema>;
