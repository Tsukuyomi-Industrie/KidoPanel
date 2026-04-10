/** Liaison du port hôte vers un port conteneur (ex. `"80/tcp"`). */
export interface PortBinding {
  hostIp?: string;
  hostPort: string;
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
  env?: Record<string, string>;
  labels?: Record<string, string>;
  /** Clés du type `"80/tcp"` avec valeur objet vide (`ExposedPorts`). */
  exposedPorts?: string[];
  hostConfig?: ContainerHostConfig;
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
