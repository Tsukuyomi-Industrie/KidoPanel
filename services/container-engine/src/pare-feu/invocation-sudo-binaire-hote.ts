/**
 * Fabrique l’appel à un binaire système avec les mêmes règles que pour firewall-cmd / ufw :
 * root → exécution directe ; sinon `sudo -n` (NOPASSWD requis pour l’automatisation).
 */
export function resoudreInvocationSudoPourBinaireSysteme(params: {
  cheminDefautAbsolu: string;
  cleEnvChemin?: string;
}): { executable: string; prefixeArguments: string[] } {
  const depuisEnv =
    params.cleEnvChemin !== undefined
      ? process.env[params.cleEnvChemin]?.trim()
      : undefined;
  const binaire =
    depuisEnv !== undefined && depuisEnv.length > 0
      ? depuisEnv
      : params.cheminDefautAbsolu;

  if (
    typeof process.geteuid === "function" &&
    process.geteuid() === 0
  ) {
    return { executable: binaire, prefixeArguments: [] };
  }
  if (process.env.CONTAINER_ENGINE_PAREFEU_SANS_SUDO?.trim() === "1") {
    return { executable: binaire, prefixeArguments: [] };
  }
  return {
    executable: "sudo",
    prefixeArguments: ["-n", binaire],
  };
}
