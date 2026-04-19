import type { ImageInspectInfo } from "dockerode";

/** Proposition de corps minimal pour démarrer un conteneur à partir du manifeste d’image Docker. */
export type SuggestionConfigurationImageDocker = {
  referenceDocker: string;
  cmd?: string[];
  entrypoint?: string[];
  workingDir?: string;
  env?: Record<string, string>;
  exposedPorts?: string[];
  tty?: boolean;
  openStdin?: boolean;
  /** Messages explicatifs pour l’interface (aucun secret). */
  avertissements: string[];
};

function tableauChainesNonVide(v: unknown): v is string[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((x) => typeof x === "string") &&
    v.some((s) => s.trim().length > 0)
  );
}

function parserEnvDocker(envBrut: string[] | null | undefined): Record<string, string> {
  const sortie: Record<string, string> = {};
  if (Array.isArray(envBrut) === false) {
    return sortie;
  }
  for (const ligne of envBrut) {
    const idx = ligne.indexOf("=");
    if (idx > 0) {
      sortie[ligne.slice(0, idx)] = ligne.slice(idx + 1);
    }
  }
  return sortie;
}

function portsExposesDepuisInspect(
  exposed: ImageInspectInfo["Config"]["ExposedPorts"],
): string[] | undefined {
  if (exposed === null || exposed === undefined || typeof exposed !== "object") {
    return undefined;
  }
  const cles = Object.keys(exposed);
  return cles.length > 0 ? cles : undefined;
}

/**
 * Déduit une configuration de démarrage exploitable depuis l’inspection d’image (`docker image inspect`).
 */
export function construireSuggestionConfigurationDepuisInspectionImage(
  referenceDocker: string,
  inspection: ImageInspectInfo,
): SuggestionConfigurationImageDocker {
  const avertissements: string[] = [];
  const cfg = inspection.Config;
  const cmdBrut = cfg?.Cmd;
  const epBrut = cfg?.Entrypoint;

  const cmdPresent = tableauChainesNonVide(cmdBrut);
  const epPresent = tableauChainesNonVide(epBrut);

  let cmdSuggere: string[] | undefined;
  let entrySuggere: string[] | undefined;

  if (epPresent && epBrut !== undefined) {
    entrySuggere = [...epBrut];
  }
  if (cmdPresent && cmdBrut !== undefined) {
    cmdSuggere = [...cmdBrut];
  }

  if (cmdPresent === false && epPresent === false) {
    cmdSuggere = ["sleep", "infinity"];
    avertissements.push(
      "L’image ne définit ni commande ni entrypoint : proposition « sleep infinity » pour garder le conteneur actif.",
    );
  } else if (
    cmdPresent &&
    epPresent === false &&
    cmdSuggere !== undefined &&
    cmdSuggere.length === 1
  ) {
    const seul = cmdSuggere[0].toLowerCase();
    if (
      seul === "/bin/bash" ||
      seul === "bash" ||
      seul === "/bin/sh" ||
      seul === "sh"
    ) {
      cmdSuggere = ["sleep", "infinity"];
      avertissements.push(
        "Commande shell interactive seule : pour un service toujours actif, « sleep infinity » est proposé à la place.",
      );
    }
  }

  const wd = cfg?.WorkingDir?.trim();
  const env = parserEnvDocker(cfg?.Env ?? undefined);
  const exposedPorts = portsExposesDepuisInspect(cfg?.ExposedPorts);

  return {
    referenceDocker,
    ...(cmdSuggere === undefined ? {} : { cmd: cmdSuggere }),
    ...(entrySuggere === undefined ? {} : { entrypoint: entrySuggere }),
    ...(wd === undefined || wd.length === 0 ? {} : { workingDir: wd }),
    ...(Object.keys(env).length > 0 ? { env } : {}),
    ...(exposedPorts === undefined ? {} : { exposedPorts }),
    avertissements,
  };
}
