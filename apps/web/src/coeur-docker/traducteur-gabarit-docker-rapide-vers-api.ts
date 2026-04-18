import type { GabaritDockerRapide } from "@kidopanel/container-catalog";

const CLES_META = new Set(["NOM_CONTAINER", "PORT_HOTE"]);

/**
 * Assemble le corps JSON `POST /containers` pour un gabarit Docker rapide
 * à partir des valeurs du formulaire générique (sans passer par un textarea JSON).
 */
export function traduireGabaritDockerRapideVersCorpsApi(params: {
  gabarit: GabaritDockerRapide;
  valeursChamps: Record<string, string>;
}): Record<string, unknown> {
  const nomBrut = params.valeursChamps.NOM_CONTAINER?.trim();
  const nom = nomBrut !== undefined && nomBrut.length > 0 ? nomBrut : "instance-kidopanel";
  const portHoteBrut = params.valeursChamps.PORT_HOTE?.trim();
  const portPremierMapping = params.gabarit.mappingPortsDefaut[0]?.hoteDefaut ?? 0;
  const portHoteCalcule =
    portHoteBrut !== undefined && portHoteBrut.length > 0
      ? Number(portHoteBrut)
      : portPremierMapping;
  if (
    !Number.isFinite(portHoteCalcule) ||
    portHoteCalcule < 0 ||
    portHoteCalcule > 65535
  ) {
    throw new Error(
      "Le port hôte doit être 0 (attribution automatique) ou un nombre entre 1 et 65535.",
    );
  }
  const publicationHoteDocker =
    portHoteCalcule === 0 ? "0" : String(Math.trunc(portHoteCalcule));

  const env: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(params.valeursChamps)) {
    if (CLES_META.has(cle)) {
      continue;
    }
    if (valeur.trim() !== "") {
      env[cle] = valeur.trim();
    }
  }

  const exposedPorts: string[] = [];
  const portBindings: Record<string, Array<{ hostIp: string; hostPort: string }>> =
    {};
  for (const ligne of params.gabarit.mappingPortsDefaut) {
    const clePort = `${String(ligne.conteneur)}/${ligne.protocole}`;
    exposedPorts.push(clePort);
    portBindings[clePort] = [{ hostIp: "", hostPort: publicationHoteDocker }];
  }

  const corps: Record<string, unknown> = {
    name: nom,
    imageCatalogId: params.gabarit.imageCatalogId,
    exposedPorts,
    hostConfig: {
      memoryBytes: params.gabarit.memoireRecommandeMb * 1024 * 1024,
      portBindings,
      restartPolicy: { name: "unless-stopped" },
    },
  };
  if (
    params.gabarit.cmdDockerParDefaut !== undefined &&
    params.gabarit.cmdDockerParDefaut.length > 0
  ) {
    corps.cmd = [...params.gabarit.cmdDockerParDefaut];
  }
  if (Object.keys(env).length > 0) {
    corps.env = env;
  }
  return corps;
}
