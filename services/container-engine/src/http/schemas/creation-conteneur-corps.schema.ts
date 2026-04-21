import { IDENTIFIANTS_IMAGES_CATALOGUE } from "@kidopanel/container-catalog";
import { z } from "zod";
import {
  normaliserExposedPortsPourValidationZod,
  normaliserLogConfigHostPourValidationZod,
} from "./normalisation-corps-api-docker-zod.js";
import { MOTIF_NOM_RESEAU_BRIDGE_UTILISATEUR_KIDOPANEL } from "../../docker/reseau-interne-kidopanel.constantes.js";
import { appliquerRefinementZodImageCatalogueOuReferenceLibre } from "./refinement-zod-image-catalogue-ou-reference-libre.js";

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

/**
 * Entrée `Mounts` au format moteur Docker (clés PascalCase comme dans l’API Engine),
 * avec champs additionnels autorisés pour coller aux options Portainer / Docker.
 */
const montageMoteurSchema = z
  .object({
    Type: z.string().min(1).max(32),
    Target: z.string().min(1).max(4096),
  })
  .passthrough();

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
const hostConfigCorpsSchema = z
  .object({
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
    dnsOptions: z.array(z.string().min(1).max(256)).max(32).optional(),
    extraHosts: z.array(z.string().min(1).max(1024)).max(64).optional(),
    capAdd: z.array(z.string().min(1).max(64)).max(64).optional(),
    capDrop: z.array(z.string().min(1).max(64)).max(64).optional(),
    securityOpts: z.array(z.string().min(1).max(512)).max(32).optional(),
    shmSizeBytes: z.number().int().positive().optional(),
    tmpfs: z.record(z.string().min(1).max(4096), z.string().max(512)).optional(),
    ulimits: z.array(ulimitSchema).max(64).optional(),
    sysctls: z
      .record(z.string().min(1).max(256), z.string().max(512))
      .optional()
      .refine(
        (val) => val === undefined || Object.keys(val).length <= 64,
        "Au plus 64 clés sysctl.",
      ),
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
    logConfig: z.preprocess(
      normaliserLogConfigHostPourValidationZod,
      configurationJournauxSchema.optional(),
    ),
    ipcMode: z.string().min(1).max(256).optional(),
    pidMode: z.string().min(1).max(256).optional(),
    utsMode: z.string().min(1).max(256).optional(),
    usernsMode: z.string().min(1).max(256).optional(),
    cgroupnsMode: z.enum(["private", "host"]).optional(),
    runtime: z.string().min(1).max(128).optional(),
    mounts: z.array(montageMoteurSchema).max(64).optional(),
    memoryReservationBytes: z.number().int().positive().optional(),
    memorySwapBytes: z.number().int().optional(),
    memorySwappiness: z.number().int().min(-1).max(100).optional(),
    oomKillDisable: z.boolean().optional(),
    oomScoreAdj: z.number().int().min(-1000).max(1000).optional(),
    blkioWeight: z.number().int().min(10).max(1000).optional(),
    cgroupParent: z.string().max(256).optional(),
    volumeDriver: z.string().max(256).optional(),
    volumesFrom: z.array(z.string().min(1).max(512)).max(128).optional(),
    deviceCgroupRules: z.array(z.string().min(1).max(512)).max(128).optional(),
    consoleSize: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]).optional(),
  })
  .passthrough();

/** Corps JSON pour `POST /containers` (création), aligné sur `ContainerCreateSpec`. */
export const createContainerJsonSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    imageCatalogId: z.enum(IDENTIFIANTS_IMAGES_CATALOGUE).optional(),
    /** Référence Docker Hub ou autre registre consulté par le démon Docker (prioritaire sur `imageCatalogId`). */
    imageReference: z.string().max(512).optional(),
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
  exposedPorts: z.preprocess(
    normaliserExposedPortsPourValidationZod,
    z.array(z.string().min(1).max(64)).max(128).optional(),
  ),
  hostConfig: hostConfigCorpsSchema.optional(),
  networkingConfig: configurationReseauCreationSchema.optional(),
  healthcheck: healthcheckSchema.optional(),
  openStdin: z.boolean().optional(),
  tty: z.boolean().optional(),
  attachStdin: z.boolean().optional(),
  attachStdout: z.boolean().optional(),
  attachStderr: z.boolean().optional(),
  stdinOnce: z.boolean().optional(),
  platform: z.string().min(1).max(128).optional(),
  stopTimeout: z.number().int().min(0).max(3600).optional(),
  networkDisabled: z.boolean().optional(),
  volumes: z.record(z.string().min(1).max(4096), z.object({})).optional(),
  onBuild: z.array(z.string().min(1).max(8192)).max(128).optional(),
    shell: z.array(z.string().min(1).max(256)).max(16).optional(),
  reseauBridgeNom: z
    .string()
    .min(3)
    .max(128)
    .regex(MOTIF_NOM_RESEAU_BRIDGE_UTILISATEUR_KIDOPANEL)
    .optional(),
  reseauDualAvecKidopanel: z.boolean().optional(),
  reseauPrimaireKidopanel: z.boolean().optional(),
  })
  .superRefine((donnees, ctx) =>
    appliquerRefinementZodImageCatalogueOuReferenceLibre(
      donnees,
      ctx,
      "Indiquez « imageReference » pour une image Docker Hub ou registre accessible au démon, ou « imageCatalogId » pour le catalogue KidoPanel.",
    ),
  )
  .superRefine((donnees, ctx) => {
    if (donnees.reseauDualAvecKidopanel === true) {
      const pont = donnees.reseauBridgeNom?.trim();
      if (pont === undefined || pont.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Le mode double réseau impose « reseauBridgeNom » (pont créé depuis le panel).",
          path: ["reseauBridgeNom"],
        });
      }
    }
    const modeReseau = donnees.hostConfig?.networkMode;
    const modeNormalise =
      typeof modeReseau === "string" ? modeReseau.trim().toLowerCase() : "";
    if (
      donnees.reseauDualAvecKidopanel === true &&
      (modeNormalise === "host" || modeNormalise === "none")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Le double attachement réseau est incompatible avec les modes « host » et « none ».",
        path: ["hostConfig", "networkMode"],
      });
    }
  });

export type CreateContainerJson = z.infer<typeof createContainerJsonSchema>;
