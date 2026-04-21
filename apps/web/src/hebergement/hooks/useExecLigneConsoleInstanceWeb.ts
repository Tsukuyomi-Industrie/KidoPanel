import { useCallback, useState } from "react";
import { posterExecInstanceWebPasserelle } from "../../passerelle/serviceExecConteneurPasserelle.js";

/** Sorties `exec` agrégées pour une instance web (hors flux journaux SSE). */
export function useExecLigneConsoleInstanceWeb(params: {
  readonly idInstanceWeb: string;
  readonly actif: boolean;
}) {
  const [lignesSortieExec, definirLignesSortieExec] = useState<string[]>([]);
  const [chargementExec, definirChargementExec] = useState(false);
  const [erreurExecSaisie, definirErreurExecSaisie] = useState<string | null>(
    null,
  );

  const envoyerLigneShell = useCallback(
    async (ligneBrute: string) => {
      const ligne = ligneBrute.trim();
      if (ligne.length === 0 || !params.actif) {
        return;
      }
      definirChargementExec(true);
      definirErreurExecSaisie(null);
      try {
        const resultat = await posterExecInstanceWebPasserelle(
          params.idInstanceWeb,
          { cmd: ["/bin/sh", "-c", ligne] },
        );
        const morceaux: string[] = [
          `$ ${ligne}`,
          `code ${String(resultat.exitCode)}`,
        ];
        if (resultat.stdout.trim().length > 0) {
          morceaux.push(resultat.stdout.trimEnd());
        }
        if (resultat.stderr.trim().length > 0) {
          morceaux.push(`stderr:\n${resultat.stderr.trimEnd()}`);
        }
        definirLignesSortieExec((prec) => [...prec, morceaux.join("\n")]);
      } catch (error_) {
        definirErreurExecSaisie(
          error_ instanceof Error ? error_.message : String(error_),
        );
      } finally {
        definirChargementExec(false);
      }
    },
    [params.actif, params.idInstanceWeb],
  );

  const effacerSortiesExec = useCallback(() => {
    definirLignesSortieExec([]);
    definirErreurExecSaisie(null);
  }, []);

  return {
    lignesSortieExec,
    chargementExec,
    erreurExecSaisie,
    envoyerLigneShell,
    effacerSortiesExec,
  };
}
