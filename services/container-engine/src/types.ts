/** Liaison du port hôte vers un port conteneur (ex. `"80/tcp"`). */
export interface PortBinding {
  hostIp?: string;
  hostPort: string;
}

/** Politique de redémarrage alignée sur `HostConfig.RestartPolicy` Docker. */
export interface PolitiqueRedemarrageConteneur {
  name: "no" | "always" | "on-failure" | "unless-stopped";
  maximumRetryCount?: number;
}

/** Entrée ulimit pour la création (`HostConfig.Ulimits`). */
export interface UlimitConteneur {
  name: string;
  soft: number;
  hard: number;
}

/** Périphérique exposé au conteneur (`HostConfig.Devices`). */
export interface PeripheriqueConteneur {
  pathOnHost: string;
  pathInContainer: string;
  cgroupPermissions?: string;
}

/** Pilote des journaux Docker (`HostConfig.LogConfig`). */
export interface ConfigurationJournauxConteneur {
  type: string;
  config?: Record<string, string>;
}

/** Paramètres du contrôle de santé (`Config.Healthcheck`). */
export interface HealthcheckConteneur {
  test: string[];
  intervalSeconds?: number;
  timeoutSeconds?: number;
  retries?: number;
  startPeriodSeconds?: number;
}

/** Réglages d’un point de terminaison pour `NetworkingConfig.EndpointsConfig`. */
export interface ParametresPointReseauConteneur {
  aliases?: string[];
  ipv4Address?: string;
  ipv6Address?: string;
}

/** Attachement réseau à la création (`NetworkingConfig`). */
export interface ConfigurationReseauCreationConteneur {
  endpointsConfig?: Record<string, ParametresPointReseauConteneur>;
}

export interface ContainerHostConfig {
  /** Limite mémoire en octets (champ Docker `HostConfig.Memory`). */
  memoryBytes?: number;
  /** Quota CPU en milliardièmes de cœur (champ Docker `HostConfig.NanoCpus`). */
  nanoCpus?: number;
  /** Association port conteneur → liaisons côté hôte. */
  portBindings?: Record<string, PortBinding[]>;
  /** Supprimer le conteneur après arrêt (`HostConfig.AutoRemove`). */
  autoRemove?: boolean;
  /** Montages : chemin hôte → chemin conteneur (syntaxe Docker `Binds`). */
  binds?: string[];
  restartPolicy?: PolitiqueRedemarrageConteneur;
  /** Mode réseau (`HostConfig.NetworkMode`), ex. `bridge`, `host`, `none`, `container:nom`. */
  networkMode?: string;
  privileged?: boolean;
  /** Système de fichiers racine en lecture seule (`HostConfig.ReadonlyRootfs`). */
  readonlyRootfs?: boolean;
  publishAllPorts?: boolean;
  dns?: string[];
  dnsSearch?: string[];
  extraHosts?: string[];
  capAdd?: string[];
  capDrop?: string[];
  securityOpts?: string[];
  /** Taille du segment mémoire partagée en octets (`HostConfig.ShmSize`). */
  shmSizeBytes?: number;
  /** Montages tmpfs : chemin → options (`HostConfig.Tmpfs`). */
  tmpfs?: Record<string, string>;
  ulimits?: UlimitConteneur[];
  sysctls?: Record<string, string>;
  groupAdd?: string[];
  /** Processus `init` comme PID 1 (`HostConfig.Init`). */
  init?: boolean;
  cpuShares?: number;
  cpuPeriod?: number;
  cpuQuota?: number;
  cpusetCpus?: string;
  cpusetMems?: string;
  pidsLimit?: number;
  storageOpt?: Record<string, string>;
  devices?: PeripheriqueConteneur[];
  logConfig?: ConfigurationJournauxConteneur;
}

/**
 * Spécification de création de haut niveau, traduite vers l’API Docker Engine par {@link ContainerEngine}.
 */
export interface ContainerCreateSpec {
  /** Nom du conteneur (paramètre de requête Docker `name`). */
  name?: string;
  /** Référence d’image, ex. `nginx:alpine`. */
  image: string;
  /** Arguments du processus principal (`Cmd`). */
  cmd?: string[];
  /** Point d’entrée (`Entrypoint`). */
  entrypoint?: string[];
  /** Répertoire de travail (`WorkingDir`). */
  workingDir?: string;
  /** Utilisateur ou uid:gid (`User`). */
  user?: string;
  /** Nom d’hôte du conteneur (`Hostname`). */
  hostname?: string;
  domainname?: string;
  macAddress?: string;
  /** Signal d’arrêt (`StopSignal`). */
  stopSignal?: string;
  env?: Record<string, string>;
  labels?: Record<string, string>;
  /** Clés du type `"80/tcp"` avec valeur objet vide (`ExposedPorts`). */
  exposedPorts?: string[];
  hostConfig?: ContainerHostConfig;
  networkingConfig?: ConfigurationReseauCreationConteneur;
  healthcheck?: HealthcheckConteneur;
  /** Attacher l’entrée standard (`OpenStdin`). */
  openStdin?: boolean;
  /** Allouer un TTY (`Tty`). */
  tty?: boolean;
}

export type ContainerStatus =
  | "created"
  | "running"
  | "paused"
  | "restarting"
  | "removing"
  | "exited"
  | "dead"
  | "unknown";

export interface ContainerSummary {
  id: string;
  names: string[];
  image: string;
  imageId: string;
  command: string;
  created: number;
  status: string;
  state: ContainerStatus;
  labels: Record<string, string>;
  ports: Array<{
    privatePort: number;
    publicPort?: number;
    type: string;
    ip?: string;
  }>;
}

export interface CreateContainerResult {
  id: string;
  warnings: string[];
}
