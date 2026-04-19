import type { DockerClient } from "../docker-connection.js";
import type { ContainerCreateSpec, CreateContainerResult } from "../types.js";
import type { ServiceTirageImageMoteur } from "../image-puller.service.js";
import type { ServiceJournauxFichierConteneur } from "../journaux-fichier-conteneur/journaux-fichier-conteneur.service.js";
import { journaliserMoteur } from "../observabilite/journal-json.js";
import { resoudreImagePourCreation } from "../image-validator.service.js";
import { ContainerEngineError } from "../errors.js";
import { wrapDockerError } from "./wrap-docker-operation.js";
import { traduireOptionsCreationConteneur } from "./traduction-options-creation-conteneur.js";
import { garantirReseauKidopanelNetworkParDefaut } from "./network.service.js";
import { verifierPontReseauNomExisteSurHote } from "./reseau-utilisateur-docker.service.js";
import { connecterConteneurIdentifiantAuReseauParNomDocker } from "./connexion-reseau-adjoint-post-creation.js";
import { appliquerAttachementReseauInterneKidopanelSurSpec } from "./appliquer-spec-reseau-interne.js";
import { extraireIpv4ConteneurSurReseauNomme } from "./extraction-ip-reseau-inspection.js";
import { NOM_RESEAU_BRIDGE_INTERNE_KIDOPANEL } from "./reseau-interne-kidopanel.constantes.js";

type MetaTirageCreation =
  | {
      mode: "catalogue";
      idCatalogue: string;
      referenceDocker: string;
    }
  | {
      mode: "libre";
      referenceDocker: string;
    };

function construireMetaTirageDepuisResolution(
  resolu: ReturnType<typeof resoudreImagePourCreation>,
): MetaTirageCreation {
  if (resolu.mode === "catalogue") {
    return {
      mode: "catalogue",
      idCatalogue: resolu.idCatalogue,
      referenceDocker: resolu.referenceDocker,
    };
  }
  return {
    mode: "libre",
    referenceDocker: resolu.referenceDocker,
  };
}

/**
 * Chaîne catalogue ou référence libre, création du réseau interne, attachement bridge,
 * création Docker et lecture de l’IPv4 privée depuis l’inspection du conteneur.
 */
export async function executerCreationConteneurDocker(
  deps: {
    docker: DockerClient;
    serviceTirageImage: ServiceTirageImageMoteur;
    journauxFichierConteneur?: ServiceJournauxFichierConteneur;
  },
  spec: ContainerCreateSpec,
  options?: { requestId?: string },
): Promise<CreateContainerResult> {
  const requestId = options?.requestId;
  const resolu = resoudreImagePourCreation(spec, requestId);
  const metaTirage = construireMetaTirageDepuisResolution(resolu);
  await deps.serviceTirageImage.garantirPresenceImagePourCreation(
    metaTirage,
    requestId,
  );

  const pontPerso = spec.reseauBridgeNom?.trim();
  const dual = spec.reseauDualAvecKidopanel === true;
  const primaireKido = spec.reseauPrimaireKidopanel !== false;

  if (dual && (pontPerso === undefined || pontPerso.length === 0)) {
    throw new ContainerEngineError(
      "INVALID_SPEC",
      "Le mode double réseau exige « reseauBridgeNom » vers un pont utilisateur existant.",
    );
  }

  const uniquementKidopanel =
    (pontPerso === undefined || pontPerso.length === 0) && !dual;
  const uniquementPontPerso =
    pontPerso !== undefined && pontPerso.length > 0 && !dual;
  const modeDoublePont =
    pontPerso !== undefined && pontPerso.length > 0 && dual;

  if (uniquementKidopanel) {
    await garantirReseauKidopanelNetworkParDefaut(deps.docker, { requestId });
  } else if (uniquementPontPerso) {
    await verifierPontReseauNomExisteSurHote(deps.docker, pontPerso);
  } else if (modeDoublePont) {
    await garantirReseauKidopanelNetworkParDefaut(deps.docker, { requestId });
    await verifierPontReseauNomExisteSurHote(deps.docker, pontPerso);
  }

  const specAvecReseau = appliquerAttachementReseauInterneKidopanelSurSpec(spec);
  const opts = traduireOptionsCreationConteneur(specAvecReseau, resolu.referenceDocker);
  try {
    const container = await deps.docker.createContainer(opts);

    let nomReseauAdjointPourIp: string | undefined;
    if (modeDoublePont && pontPerso !== undefined) {
      const nomAdjoint = primaireKido ? pontPerso : NOM_RESEAU_BRIDGE_INTERNE_KIDOPANEL;
      await connecterConteneurIdentifiantAuReseauParNomDocker(
        deps.docker,
        container.id,
        nomAdjoint,
      );
      nomReseauAdjointPourIp = nomAdjoint;
    }

    let ipReseauInterne: string | undefined;
    let ipReseauAdjoint: string | undefined;
    try {
      const inspection = await container.inspect();
      const nomReseauPourIpPrimaire =
        specAvecReseau.hostConfig?.networkMode?.trim() ??
        NOM_RESEAU_BRIDGE_INTERNE_KIDOPANEL;
      ipReseauInterne = extraireIpv4ConteneurSurReseauNomme(
        inspection,
        nomReseauPourIpPrimaire,
      );
      if (nomReseauAdjointPourIp !== undefined) {
        ipReseauAdjoint = extraireIpv4ConteneurSurReseauNomme(
          inspection,
          nomReseauAdjointPourIp,
        );
      }
      if (ipReseauInterne !== undefined) {
        journaliserMoteur({
          niveau: "info",
          message: "creation_conteneur_ipv4_reseau_interne_lue",
          requestId,
          metadata: {
            idConteneur: container.id,
            nomReseau: nomReseauPourIpPrimaire,
            ipReseauInterne,
            ipReseauAdjoint,
          },
        });
      }
    } catch (error_) {
      journaliserMoteur({
        niveau: "warn",
        message: "creation_conteneur_inspection_post_creation_echouee",
        requestId,
        metadata: {
          idConteneur: container.id,
          codeErreur: String(error_),
        },
      });
    }
    journaliserMoteur({
      niveau: "info",
      message: "creation_conteneur_catalogue_terminee",
      requestId,
      metadata: {
        idConteneur: container.id,
        idCatalogue:
          resolu.mode === "catalogue" ? resolu.idCatalogue : undefined,
        referenceDocker: resolu.referenceDocker,
      },
    });
    const resultat: CreateContainerResult = {
      id: container.id,
      warnings: [],
      ...(ipReseauInterne !== undefined ? { ipReseauInterne } : {}),
      ...(ipReseauAdjoint !== undefined ? { ipReseauAdjoint } : {}),
    };
    deps.journauxFichierConteneur
      ?.notifierCreation(resultat.id, {
        referenceDockerEffective: resolu.referenceDocker,
        idCatalogueImage:
          resolu.mode === "catalogue" ? resolu.idCatalogue : undefined,
        nomConteneur: spec.name,
        hostname: spec.hostname,
        idRequete: requestId,
      })
      .catch(() => {});
    return resultat;
  } catch (error_) {
    wrapDockerError(error_);
  }
}
