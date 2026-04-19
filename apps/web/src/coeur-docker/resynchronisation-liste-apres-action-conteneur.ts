import type { ResumeConteneurLab } from "../lab/typesConteneurLab.js";

/** Actions lifecycle exposées par `POST /containers/:id/…` sur la passerelle. */
export type SuffixeLifecycleConteneurPanel = "/stop" | "/start";

/**
 * Met à jour immédiatement la ligne du tableau pour éviter que l’état reste bloqué
 * tant que le démon ou la passerelle ne renvoient pas encore la valeur finale.
 */
export function appliquerEtatOptimisteLifecycleSurListe(
  liste: readonly ResumeConteneurLab[],
  idConteneur: string,
  suffixe: SuffixeLifecycleConteneurPanel,
): ResumeConteneurLab[] {
  const etatVoulu = suffixe === "/stop" ? "exited" : "running";
  const libelleCourt =
    suffixe === "/stop" ? "Arrêt signalé…" : "Démarrage signalé…";
  return liste.map((c) =>
    c.id === idConteneur
      ? { ...c, state: etatVoulu, status: libelleCourt }
      : c,
  );
}

/**
 * Relit `GET /containers` jusqu’à ce que la ligne du conteneur affiche l’état attendu,
 * avec un délai entre les essais pour laisser Docker actualiser son cache de liste.
 */
export async function bouclerResynchronisationListeApresLifecycle(options: {
  suffixe: SuffixeLifecycleConteneurPanel;
  idConteneur: string;
  telechargerListe: () => Promise<ResumeConteneurLab[] | null>;
  majListe: (liste: ResumeConteneurLab[]) => void;
  essaisMax?: number;
  delaiMs?: number;
}): Promise<void> {
  const etatVoulu = options.suffixe === "/stop" ? "exited" : "running";
  const essaisMax = options.essaisMax ?? 12;
  const delaiMs = options.delaiMs ?? 300;
  /* Sans délai initial, le premier GET /containers peut encore refléter l’état d’avant l’action et annuler la ligne optimiste. */
  await new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, 380);
  });
  for (let essai = 0; essai < essaisMax; essai++) {
    if (essai > 0) {
      await new Promise<void>((resolve) => {
        globalThis.setTimeout(resolve, delaiMs);
      });
    }
    const liste = await options.telechargerListe();
    if (liste === null) {
      return;
    }
    options.majListe(liste);
    const cible = liste.find((c) => c.id === options.idConteneur);
    if (cible?.state === etatVoulu) {
      return;
    }
  }
}
