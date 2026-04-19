import type {
  ContainerCreateOptions,
  DeviceMapping,
  EndpointSettings,
  HealthConfig,
  HostConfig,
  PortBinding as DockerPortBinding,
  Ulimit as DockerUlimit,
} from "dockerode";
import type { ContainerCreateSpec, ContainerHostConfig } from "../types.js";
import { CLES_HOSTCONFIG_API_NORMALISEES } from "./cles-hostconfig-api-normalisees.js";

/**
 * Forme du champ `NetworkingConfig` à la création (non exportée par les types dockerode
 * de ce dépôt ; alignée sur l’API Docker Engine).
 */
interface ConfigurationReseauCreationDocker {
  EndpointsConfig: Record<string, EndpointSettings>;
}

/** Secondes positives vers nanosecondes entières pour les champs santé Docker. */
function secondesVersNanosecondes(secondes: number | undefined): number | undefined {
  if (secondes === undefined) {
    return undefined;
  }
  return Math.round(secondes * 1_000_000_000);
}

/** Construit le champ Docker `ExposedPorts` à partir d’une liste de ports (`"80/tcp"`). */
function exposerPortsDepuisListe(
  ports: string[] | undefined,
): Record<string, object> | undefined {
  if (!ports?.length) {
    return undefined;
  }
  const sortie: Record<string, object> = {};
  for (const port of ports) {
    sortie[port] = {};
  }
  return sortie;
}

/** Traduit les liaisons métier vers le format `PortBindings` de l’API Docker. */
function liaisonsPortsVersDocker(
  liaisons: ContainerHostConfig["portBindings"],
): Record<string, DockerPortBinding[]> | undefined {
  if (!liaisons) {
    return undefined;
  }
  const sortie: Record<string, DockerPortBinding[]> = {};
  for (const [portConteneur, liste] of Object.entries(liaisons)) {
    sortie[portConteneur] = liste.map((liaison) => ({
      HostIp: liaison.hostIp ?? "0.0.0.0",
      HostPort: liaison.hostPort,
    }));
  }
  return sortie;
}

/** Traduit la politique de redémarrage métier vers l’objet Docker. */
function politiqueRedemarrageVersDocker(
  politique: ContainerHostConfig["restartPolicy"],
): HostConfig["RestartPolicy"] {
  if (!politique) {
    return undefined;
  }
  return {
    Name: politique.name,
    MaximumRetryCount: politique.maximumRetryCount ?? 0,
  };
}

/** Traduit les ulimits métier vers le format Docker. */
function ulimitsVersDocker(
  ulimits: ContainerHostConfig["ulimits"],
): DockerUlimit[] | undefined {
  if (!ulimits?.length) {
    return undefined;
  }
  return ulimits.map((u) => ({
    Name: u.name,
    Soft: u.soft,
    Hard: u.hard,
  }));
}

/** Traduit les périphériques métier vers le format Docker. */
function peripheriquesVersDocker(
  liste: ContainerHostConfig["devices"],
): DeviceMapping[] | undefined {
  if (!liste?.length) {
    return undefined;
  }
  return liste.map((d) => ({
    PathOnHost: d.pathOnHost,
    PathInContainer: d.pathInContainer,
    CgroupPermissions: d.cgroupPermissions ?? "rwm",
  }));
}

/** Construit `NetworkingConfig` pour les réseaux nommés à la création. */
function configurationReseauVersDocker(
  spec: ContainerCreateSpec,
): ConfigurationReseauCreationDocker | undefined {
  const points = spec.networkingConfig?.endpointsConfig;
  if (!points || Object.keys(points).length === 0) {
    return undefined;
  }
  const endpointsConfig: Record<string, EndpointSettings> = {};
  for (const [nomReseau, reglages] of Object.entries(points)) {
    const ipam =
      reglages.ipv4Address || reglages.ipv6Address
        ? {
            IPv4Address: reglages.ipv4Address,
            IPv6Address: reglages.ipv6Address,
          }
        : undefined;
    const bloc: EndpointSettings = {};
    if (reglages.aliases?.length) {
      bloc.Aliases = reglages.aliases;
    }
    if (ipam) {
      bloc.IPAMConfig = ipam;
    }
    endpointsConfig[nomReseau] = bloc;
  }
  return { EndpointsConfig: endpointsConfig };
}

/** Construit le bloc `Healthcheck` attendu par Docker. */
function healthcheckVersDocker(
  healthcheck: ContainerCreateSpec["healthcheck"],
): HealthConfig | undefined {
  if (!healthcheck) {
    return undefined;
  }
  return {
    Test: healthcheck.test,
    Interval: secondesVersNanosecondes(healthcheck.intervalSeconds),
    Timeout: secondesVersNanosecondes(healthcheck.timeoutSeconds),
    Retries: healthcheck.retries,
    StartPeriod: secondesVersNanosecondes(healthcheck.startPeriodSeconds),
  };
}

/** Recopie les paires clé/valeur de `hostConfig` absentes du dictionnaire métier (format Docker ou extensions). */
function champsHoteSupplementairesVersDocker(
  host: ContainerHostConfig,
): Record<string, unknown> {
  const brut = host as Record<string, unknown>;
  const sortie: Record<string, unknown> = {};
  for (const cle of Object.keys(brut)) {
    if (!CLES_HOSTCONFIG_API_NORMALISEES.has(cle)) {
      sortie[cle] = brut[cle];
    }
  }
  return sortie;
}

/** Projette la configuration hôte métier sur un `HostConfig` Docker. */
function hostConfigVersDocker(host: ContainerHostConfig | undefined): HostConfig | undefined {
  if (!host) {
    return undefined;
  }
  const logConfigDocker = host.logConfig
    ? {
        Type: host.logConfig.type,
        Config: host.logConfig.config,
      }
    : undefined;

  const supplement = champsHoteSupplementairesVersDocker(host);

  const construit = {
    Memory: host.memoryBytes,
    NanoCpus: host.nanoCpus,
    PortBindings: liaisonsPortsVersDocker(host.portBindings),
    AutoRemove: host.autoRemove,
    Binds: host.binds,
    RestartPolicy: politiqueRedemarrageVersDocker(host.restartPolicy),
    NetworkMode: host.networkMode,
    Privileged: host.privileged,
    ReadonlyRootfs: host.readonlyRootfs,
    PublishAllPorts: host.publishAllPorts,
    Dns: host.dns,
    DnsSearch: host.dnsSearch,
    DnsOptions: host.dnsOptions,
    ExtraHosts: host.extraHosts,
    CapAdd: host.capAdd,
    CapDrop: host.capDrop,
    SecurityOpt: host.securityOpts,
    ShmSize: host.shmSizeBytes,
    Tmpfs: host.tmpfs,
    Ulimits: ulimitsVersDocker(host.ulimits),
    Sysctls: host.sysctls,
    GroupAdd: host.groupAdd,
    Init: host.init,
    CpuShares: host.cpuShares,
    CpuPeriod: host.cpuPeriod,
    CpuQuota: host.cpuQuota,
    CpusetCpus: host.cpusetCpus,
    CpusetMems: host.cpusetMems,
    PidsLimit: host.pidsLimit,
    StorageOpt: host.storageOpt,
    Devices: peripheriquesVersDocker(host.devices),
    LogConfig: logConfigDocker,
    IpcMode: host.ipcMode,
    PidMode: host.pidMode,
    UTSMode: host.utsMode,
    UsernsMode: host.usernsMode,
    CgroupnsMode: host.cgroupnsMode,
    Runtime: host.runtime,
    Mounts: host.mounts,
    MemoryReservation: host.memoryReservationBytes,
    MemorySwap: host.memorySwapBytes,
    MemorySwappiness: host.memorySwappiness,
    OomKillDisable: host.oomKillDisable,
    OomScoreAdj: host.oomScoreAdj,
    BlkioWeight: host.blkioWeight,
    CgroupParent: host.cgroupParent,
    VolumeDriver: host.volumeDriver,
    VolumesFrom: host.volumesFrom,
    DeviceCgroupRules: host.deviceCgroupRules,
    ConsoleSize: host.consoleSize,
  } as HostConfig;

  return { ...supplement, ...construit } as HostConfig;
}

/**
 * Traduit la spécification métier en options attendues par dockerode pour `createContainer`.
 * @param referenceImageDocker Référence Docker déjà validée et résolue depuis le catalogue (champ `Image`).
 */
export function traduireOptionsCreationConteneur(
  spec: ContainerCreateSpec,
  referenceImageDocker: string,
): ContainerCreateOptions {
  const env = spec.env
    ? Object.entries(spec.env).map(([cle, valeur]) => `${cle}=${valeur}`)
    : undefined;

  const reseau = configurationReseauVersDocker(spec);

  return {
    name: spec.name,
    platform: spec.platform,
    Image: referenceImageDocker,
    Cmd: spec.cmd,
    Entrypoint: spec.entrypoint,
    WorkingDir: spec.workingDir,
    User: spec.user,
    Hostname: spec.hostname,
    Domainname: spec.domainname,
    MacAddress: spec.macAddress,
    StopSignal: spec.stopSignal,
    StopTimeout: spec.stopTimeout,
    Env: env,
    Labels: spec.labels,
    ExposedPorts: exposerPortsDepuisListe(spec.exposedPorts),
    HostConfig: hostConfigVersDocker(spec.hostConfig),
    ...(reseau === undefined ? {} : { NetworkingConfig: reseau }),
    Healthcheck: healthcheckVersDocker(spec.healthcheck),
    OpenStdin: spec.openStdin,
    Tty: spec.tty,
    AttachStdin: spec.attachStdin,
    AttachStdout: spec.attachStdout,
    AttachStderr: spec.attachStderr,
    StdinOnce: spec.stdinOnce,
    NetworkDisabled: spec.networkDisabled,
    Volumes: spec.volumes,
    OnBuild: spec.onBuild,
    Shell: spec.shell,
  } as ContainerCreateOptions;
}
