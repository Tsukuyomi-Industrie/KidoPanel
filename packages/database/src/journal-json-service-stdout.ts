/**
 * Fabrique des journaliseurs JSON vers stdout pour un nom de service fixe (passerelle, moteur, etc.).
 */

export type NiveauJournalJsonStdout = "info" | "warn" | "error";

export type EntreeJournalJsonStdout = {
  niveau: NiveauJournalJsonStdout;
  message: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Retourne `journaliser` et `journaliserErreur` attachés au champ `service` JSON attendu par l’agrégateur.
 */
export function creerJournalJsonStdoutPourNomServiceInterne(params: {
  nomServiceInterne: string;
}) {
  function journaliser(entree: EntreeJournalJsonStdout): void {
    const ligne: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      niveau: entree.niveau,
      service: params.nomServiceInterne,
      message: entree.message,
    };
    if (entree.requestId !== undefined && entree.requestId.length > 0) {
      ligne.requestId = entree.requestId;
    }
    if (
      entree.metadata !== undefined &&
      Object.keys(entree.metadata).length > 0
    ) {
      ligne.metadata = entree.metadata;
    }
    console.log(JSON.stringify(ligne));
  }

  /**
   * Consigne une exception sans exposer le message brut côté client HTTP.
   */
  function journaliserErreur(
    message: string,
    erreur: unknown,
    requestId?: string,
  ): void {
    const meta: Record<string, unknown> = {};
    if (erreur instanceof Error) {
      if (erreur.message.length > 0) {
        meta.erreurMessage = erreur.message;
      }
      if (erreur.stack !== undefined) {
        meta.stack = erreur.stack;
      }
    } else {
      meta.erreur = String(erreur);
    }
    journaliser({
      niveau: "error",
      message,
      requestId,
      metadata: meta,
    });
  }

  return { journaliser, journaliserErreur };
}
