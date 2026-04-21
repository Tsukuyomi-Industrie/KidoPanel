/**
 * Journalise une erreur de configuration au démarrage et marque le processus en échec.
 */
export function journaliserRefusDemarrageConfigurationHttp(
  error_: unknown,
): void {
  console.error(
    JSON.stringify({
      niveau: "error",
      message: "demarrage_refuse_configuration",
      detail:
        error_ instanceof Error
          ? error_.message
          : "erreur_initialisation_inconnue",
    }),
  );
  process.exitCode = 1;
}

/** Retourne le callback passé à `serve` pour journaliser port et adresse d’écoute. */
export function creerJournalPretServeHttp(params: {
  cleMessage: string;
}): (info: { port: number; address: string }) => void {
  return (info) => {
    console.error(
      JSON.stringify({
        niveau: "info",
        message: params.cleMessage,
        port: info.port,
        adresse: info.address,
      }),
    );
  };
}
