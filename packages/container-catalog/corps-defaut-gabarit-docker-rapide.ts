import type { GabaritDockerRapide } from "./gabarits-docker-rapide.js";

/**
 * Construit un fragment de corps `POST /containers` servant de base pour la fusion
 * passerelle lorsque `templateId` désigne un gabarit Docker rapide.
 */
export function construireCorpsCreationDefautDepuisGabaritDockerRapide(
  gabarit: GabaritDockerRapide,
): Record<string, unknown> {
  const exposedPorts: string[] = [];
  const portBindings: Record<
    string,
    Array<{ hostIp: string; hostPort: string }>
  > = {};
  for (const ligne of gabarit.mappingPortsDefaut) {
    const clePort = `${String(ligne.conteneur)}/${ligne.protocole}`;
    exposedPorts.push(clePort);
    portBindings[clePort] = [{ hostIp: "", hostPort: "0" }];
  }
  const env: Record<string, string> = {};
  for (const champ of gabarit.champsFormulaire) {
    if (
      champ.cle === "NOM_CONTAINER" ||
      champ.cle === "PORT_HOTE" ||
      champ.defaut === undefined
    ) {
      continue;
    }
    env[champ.cle] = champ.defaut;
  }
  const corps: Record<string, unknown> = {
    name: "kidopanel-gabarit-rapide",
    exposedPorts,
    hostConfig: {
      memoryBytes: gabarit.memoireRecommandeMb * 1024 * 1024,
      portBindings,
      restartPolicy: { name: "unless-stopped" },
    },
  };
  if (gabarit.cmdDockerParDefaut !== undefined && gabarit.cmdDockerParDefaut.length > 0) {
    corps.cmd = [...gabarit.cmdDockerParDefaut];
  }
  if (Object.keys(env).length > 0) {
    corps.env = env;
  }
  return corps;
}
