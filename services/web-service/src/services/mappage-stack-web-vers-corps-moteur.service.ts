import type { WebStack } from "@kidopanel/database";
import {
  construireCorpsCreationDefautDepuisGabaritDockerRapide,
  trouverGabaritDockerRapideParId,
  type GabaritDockerRapide,
} from "@kidopanel/container-catalog";
import { ErreurMetierWebInstance } from "../erreurs/erreurs-metier-web-instance.js";

function idGabaritDepuisStack(techStack: WebStack): string | null {
  switch (techStack) {
    case "NGINX_STATIC":
      return "rapide-nginx";
    case "NODE_JS":
      return "rapide-node";
    case "PYTHON_WSGI":
      return "rapide-node";
    case "PHP_FPM":
      return null;
    case "CUSTOM":
      return null;
    default:
      return "rapide-nginx";
  }
}

function fusionnerCorpsGabaritRapide(params: {
  gabarit: GabaritDockerRapide;
  nomConteneurDocker: string;
  memoryMb: number;
  env: Record<string, string>;
  portPublicationHote?: number;
  reseauBridgeNom?: string;
  reseauDualAvecKidopanel?: boolean;
  reseauPrimaireKidopanel?: boolean;
}): Record<string, unknown> {
  const base = construireCorpsCreationDefautDepuisGabaritDockerRapide(params.gabarit);
  const portHote =
    params.portPublicationHote !== undefined && Number.isFinite(params.portPublicationHote)
      ? String(Math.trunc(params.portPublicationHote))
      : "0";
  const hostConfig = base.hostConfig as Record<string, unknown>;
  const portBindings = hostConfig.portBindings as
    | Record<string, Array<{ hostIp: string; hostPort: string }>>
    | undefined;
  if (portBindings !== undefined) {
    for (const cle of Object.keys(portBindings)) {
      portBindings[cle] = [{ hostIp: "", hostPort: portHote }];
    }
  }
  const corps: Record<string, unknown> = {
    ...base,
    name: params.nomConteneurDocker,
    imageCatalogId: params.gabarit.imageCatalogId,
    env:
      base.env === undefined
        ? params.env
        : { ...(base.env as Record<string, string>), ...params.env },
    hostConfig: {
      ...hostConfig,
      memoryBytes: params.memoryMb * 1024 * 1024,
      nanoCpus: 500_000_000,
      portBindings,
    },
  };
  const pont = params.reseauBridgeNom?.trim();
  if (pont !== undefined && pont.length > 0) {
    corps.reseauBridgeNom = pont;
  }
  if (params.reseauDualAvecKidopanel === true) {
    corps.reseauDualAvecKidopanel = true;
  }
  if (params.reseauPrimaireKidopanel === false) {
    corps.reseauPrimaireKidopanel = false;
  }
  return corps;
}

function corpsPhpFpm(params: {
  nomConteneurDocker: string;
  memoryMb: number;
  env: Record<string, string>;
  portPublicationHote?: number;
  reseauBridgeNom?: string;
  reseauDualAvecKidopanel?: boolean;
  reseauPrimaireKidopanel?: boolean;
}): Record<string, unknown> {
  const portHote =
    params.portPublicationHote !== undefined && Number.isFinite(params.portPublicationHote)
      ? String(Math.trunc(params.portPublicationHote))
      : "0";
  const corps: Record<string, unknown> = {
    name: params.nomConteneurDocker,
    imageReference: "php:8-fpm-alpine",
    exposedPorts: ["9000/tcp"],
    env: params.env,
    hostConfig: {
      memoryBytes: params.memoryMb * 1024 * 1024,
      nanoCpus: 500_000_000,
      portBindings: {
        "9000/tcp": [{ hostIp: "", hostPort: portHote }],
      },
      restartPolicy: { name: "unless-stopped" },
    },
  };
  const pont = params.reseauBridgeNom?.trim();
  if (pont !== undefined && pont.length > 0) {
    corps.reseauBridgeNom = pont;
  }
  if (params.reseauDualAvecKidopanel === true) {
    corps.reseauDualAvecKidopanel = true;
  }
  if (params.reseauPrimaireKidopanel === false) {
    corps.reseauPrimaireKidopanel = false;
  }
  return corps;
}

/**
 * Traduit la pile technique métier et un gabarit catalogue éventuel en corps `POST /containers` pour le moteur.
 */
export function construireCorpsCreationMoteurPourInstanceWeb(params: {
  nomConteneurDocker: string;
  memoryMb: number;
  env: Record<string, string>;
  techStack: WebStack;
  gabaritDockerRapideId?: string;
  portPublicationHote?: number;
  reseauBridgeNom?: string;
  reseauDualAvecKidopanel?: boolean;
  reseauPrimaireKidopanel?: boolean;
}): Record<string, unknown> {
  if (params.techStack === "PHP_FPM") {
    return corpsPhpFpm(params);
  }

  let idGabarit = idGabaritDepuisStack(params.techStack);
  if (params.techStack === "CUSTOM") {
    const brut = params.gabaritDockerRapideId?.trim();
    if (brut === undefined || brut.length === 0) {
      throw new ErreurMetierWebInstance(
        "GABARIT_WEB_INCOMPLET",
        "Sélectionnez un gabarit Docker pour le mode personnalisé.",
        422,
      );
    }
    idGabarit = brut;
  }

  if (idGabarit === null || idGabarit.length === 0) {
    throw new ErreurMetierWebInstance(
      "GABARIT_WEB_INCOMPLET",
      "Gabarit introuvable pour cette pile.",
      422,
    );
  }

  const gabarit = trouverGabaritDockerRapideParId(idGabarit);
  if (gabarit === undefined) {
    throw new ErreurMetierWebInstance(
      "GABARIT_WEB_INCOMPLET",
      "Le gabarit Docker demandé est inconnu.",
      422,
    );
  }

  return fusionnerCorpsGabaritRapide({
    gabarit,
    nomConteneurDocker: params.nomConteneurDocker,
    memoryMb: params.memoryMb,
    env: params.env,
    portPublicationHote: params.portPublicationHote,
    reseauBridgeNom: params.reseauBridgeNom,
    reseauDualAvecKidopanel: params.reseauDualAvecKidopanel,
    reseauPrimaireKidopanel: params.reseauPrimaireKidopanel,
  });
}

/** Port applicatif interne par défaut utilisé pour un domaine proxy selon la pile (HTTP interne). */
export function portInterneDefautPourStack(techStack: WebStack): number {
  switch (techStack) {
    case "NGINX_STATIC":
      return 80;
    case "NODE_JS":
      return 3000;
    case "PHP_FPM":
      return 9000;
    case "PYTHON_WSGI":
      return 3000;
    case "CUSTOM":
      return 80;
    default:
      return 80;
  }
}
