import type { DockerClient } from "../docker-connection.js";
import { ContainerEngineError } from "../errors.js";
import { wrapDockerError } from "./wrap-docker-operation.js";
import { journaliserMoteur } from "../observabilite/journal-json.js";
import {
  cidrIpv4VersIntervalle,
  intervallesIpv4Uint32Chevauchent,
  type IntervalleIpv4Uint32,
} from "./util-plage-ipv4-cidr.js";
import {
  validerParametresPontDockerUtilisateur,
  type ParametresReseauPontValides,
} from "./validation-parametres-reseau-pont.js";
import { filtreNomReseauDocker } from "./network.service.js";
import { MOTIF_NOM_RESEAU_BRIDGE_UTILISATEUR_KIDOPANEL } from "./reseau-interne-kidopanel.constantes.js";

const PREFIXE_MIN = 16;
const PREFIXE_MAX = 28;

function analyserChevauchementsAvecReseauxExistants(
  intervalleSouhaite: IntervalleIpv4Uint32,
  listeReseaux: Array<{ Name?: string; IPAM?: { Config?: Array<{ Subnet?: string }> } }>,
): string | undefined {
  for (const reseau of listeReseaux) {
    const configs = reseau.IPAM?.Config ?? [];
    for (const cfg of configs) {
      const subnet = cfg.Subnet?.trim();
      if (subnet === undefined || subnet.length === 0) {
        continue;
      }
      const intervalleExistant = cidrIpv4VersIntervalle(subnet);
      if (
        intervalleExistant !== undefined &&
        intervallesIpv4Uint32Chevauchent(intervalleSouhaite, intervalleExistant)
      ) {
        return `Le sous-réseau demandé chevauche la plage « ${subnet} » du réseau Docker « ${String(reseau.Name ?? "?")} ».`;
      }
    }
  }
  return undefined;
}

/**
 * Crée un pont bridge Docker avec IPAM fixe pour isoler les instances d’un même compte.
 */
export async function creerReseauPontUtilisateurDocker(
  docker: DockerClient,
  entree: {
    nomDocker: string;
    sousReseauCidr: string;
    passerelleIpv4?: string;
    sansRouteVersInternetExterne: boolean;
    pontBridgeDocker?: string;
  },
  options?: { requestId?: string },
): Promise<ParametresReseauPontValides> {
  if (!MOTIF_NOM_RESEAU_BRIDGE_UTILISATEUR_KIDOPANEL.test(entree.nomDocker.trim())) {
    throw new ContainerEngineError(
      "INVALID_SPEC",
      "Le nom Docker du réseau doit suivre le motif imposé par KidoPanel (kidopanel-unet-…).",
    );
  }
  const valide = validerParametresPontDockerUtilisateur({
    sousReseauCidr: entree.sousReseauCidr,
    passerelleIpv4: entree.passerelleIpv4,
    prefixeMin: PREFIXE_MIN,
    prefixeMax: PREFIXE_MAX,
  });
  if ("erreur" in valide) {
    throw new ContainerEngineError("INVALID_SPEC", valide.erreur);
  }
  const intervalle = cidrIpv4VersIntervalle(valide.sousReseauCidr);
  if (intervalle === undefined) {
    throw new ContainerEngineError("INVALID_SPEC", "Plage CIDR invalide après validation.");
  }
  let listeExistante: Awaited<ReturnType<DockerClient["listNetworks"]>>;
  try {
    listeExistante = await docker.listNetworks();
  } catch (error_) {
    throw wrapDockerError(error_);
  }
  const messageChevauchement = analyserChevauchementsAvecReseauxExistants(
    intervalle,
    listeExistante,
  );
  if (messageChevauchement !== undefined) {
    throw new ContainerEngineError("INVALID_SPEC", messageChevauchement);
  }
  const optsCreation: Parameters<DockerClient["createNetwork"]>[0] = {
    Name: entree.nomDocker.trim(),
    Driver: "bridge",
    Internal: entree.sansRouteVersInternetExterne,
    EnableIPv6: false,
    IPAM: {
      Driver: "default",
      Config: [
        {
          Subnet: valide.sousReseauCidr,
          Gateway: valide.passerelleIpv4,
        },
      ],
    },
    Options: {
      "com.docker.network.bridge.enable_icc": "true",
      "com.docker.network.bridge.enable_ip_masquerade": "true",
      "com.docker.network.bridge.host_binding_ipv4": "0.0.0.0"
    }
  };
  const pont = entree.pontBridgeDocker?.trim();
  if (pont !== undefined && pont.length > 0) {
    optsCreation.Options = {
      "com.docker.network.bridge.name": pont.slice(0, 15),
    };
  }
  try {
    await docker.createNetwork(optsCreation);
  } catch (error_) {
    if (error_ && typeof error_ === "object" && "statusCode" in error_) {
      const sc = (error_ as { statusCode?: number }).statusCode;
      if (sc === 409) {
        throw new ContainerEngineError(
          "CONFLICT",
          "Un réseau Docker portant ce nom existe déjà ou la plage est réservée.",
          { cause: error_ },
        );
      }
    }
    throw wrapDockerError(error_);
  }
  journaliserMoteur({
    niveau: "info",
    message: "reseau_pont_utilisateur_cree",
    requestId: options?.requestId,
    metadata: {
      nomDocker: entree.nomDocker.trim(),
      sousReseauCidr: valide.sousReseauCidr,
    },
  });
  return valide;
}

/**
 * Vérifie qu’un pont nommé existe sur l’hôte avant d’attacher un conteneur (pas de création implicite).
 */
export async function verifierPontReseauNomExisteSurHote(
  docker: DockerClient,
  nomDocker: string,
): Promise<void> {
  const liste = await docker.listNetworks({
    filters: filtreNomReseauDocker(nomDocker.trim()),
  });
  const existe = liste.some((n) => n.Name === nomDocker.trim());
  if (!existe) {
    throw new ContainerEngineError(
      "INVALID_SPEC",
      `Le réseau Docker « ${nomDocker.trim()} » est introuvable : créez-le depuis le panel ou choisissez le réseau par défaut.`,
    );
  }
}

/**
 * Supprime un pont utilisateur lorsqu’aucun conteneur ne l’utilise (appelée après contrôle métier en base).
 */
export async function supprimerReseauPontParNomDocker(
  docker: DockerClient,
  nomDocker: string,
  options?: { requestId?: string },
): Promise<void> {
  const nom = nomDocker.trim();
  if (!MOTIF_NOM_RESEAU_BRIDGE_UTILISATEUR_KIDOPANEL.test(nom)) {
    throw new ContainerEngineError(
      "INVALID_SPEC",
      "Suppression refusée : nom de réseau non conforme au format KidoPanel.",
    );
  }
  const liste = await docker.listNetworks({ filters: filtreNomReseauDocker(nom) });
  const trouve = liste.find((n) => n.Name === nom);
  if (trouve?.Id === undefined) {
    throw new ContainerEngineError("NOT_FOUND", `Réseau Docker « ${nom} » introuvable.`);
  }
  try {
    const reseau = docker.getNetwork(trouve.Id);
    await reseau.remove();
  } catch (error_) {
    wrapDockerError(error_);
  }
  journaliserMoteur({
    niveau: "info",
    message: "reseau_pont_utilisateur_supprime",
    requestId: options?.requestId,
    metadata: { nomDocker: nom },
  });
}
