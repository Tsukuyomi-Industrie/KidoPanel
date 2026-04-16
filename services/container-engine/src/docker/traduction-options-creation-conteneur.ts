import type {
  ContainerCreateOptions,
  DeviceMapping,
  EndpointSettings,
  HealthConfig,
  HostConfig,
  NetworkingConfig,
  PortBinding as DockerPortBinding,
  RestartPolicy,
  Ulimit as DockerUlimit,
} from "dockerode";
import type { ContainerCreateSpec, ContainerHostConfig } from "../types.js";

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
      HostIp: liaison.hostIp ?? "",
      HostPort: liaison.hostPort,
    }));
  }
  return sortie;
}

/** Traduit la politique de redémarrage métier vers l’objet Docker. */
function politiqueRedemarrageVersDocker(
  politique: ContainerHostConfig["restartPolicy"],
): RestartPolicy | undefined {
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
): NetworkingConfig | undefined {
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

  return {
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
  };
}

/**
 * Traduit la spécification métier en options attendues par dockerode pour `createContainer`.
 */
export function traduireOptionsCreationConteneur(
  spec: ContainerCreateSpec,
): ContainerCreateOptions {
  const env = spec.env
    ? Object.entries(spec.env).map(([cle, valeur]) => `${cle}=${valeur}`)
    : undefined;

  return {
    name: spec.name,
    Image: spec.image,
    Cmd: spec.cmd,
    Entrypoint: spec.entrypoint,
    WorkingDir: spec.workingDir,
    User: spec.user,
    Hostname: spec.hostname,
    Domainname: spec.domainname,
    MacAddress: spec.macAddress,
    StopSignal: spec.stopSignal,
    Env: env,
    Labels: spec.labels,
    ExposedPorts: exposerPortsDepuisListe(spec.exposedPorts),
    HostConfig: hostConfigVersDocker(spec.hostConfig),
    NetworkingConfig: configurationReseauVersDocker(spec),
    Healthcheck: healthcheckVersDocker(spec.healthcheck),
    OpenStdin: spec.openStdin,
    Tty: spec.tty,
  };
}
