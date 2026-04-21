import { urlBasePasserelle } from "../../passerelle/url-base-passerelle.js";
import { lireJetonStockage } from "../../lab/passerelleClient.js";
import { useConsoleWebInstance } from "../hooks/useConsoleWebInstance.js";
import { useExecLigneConsoleInstanceWeb } from "../hooks/useExecLigneConsoleInstanceWeb.js";
import { ConsoleFluxInstance } from "../../interface/ConsoleFluxInstance.js";

type PropsConsoleWebInstance = {
  readonly idInstanceWeb: string;
  readonly actif: boolean;
  readonly execDisponible: boolean;
};

/**
 * Console : journaux SSE et commandes `exec` lorsque le conteneur est associé.
 */
export function ConsoleWebInstance({
  idInstanceWeb,
  actif,
  execDisponible,
}: PropsConsoleWebInstance) {
  const jeton = lireJetonStockage();
  const { lignes, etatConnexion, dernierMessageErreur, effacer } = useConsoleWebInstance({
    urlBasePasserelle: urlBasePasserelle(),
    idInstanceWeb,
    jetonBearer: jeton,
    actif,
    tailEntrees: 500,
    lignesMaxAffichage: 500,
  });
  const execActif = actif && execDisponible;
  const {
    lignesSortieExec,
    chargementExec,
    erreurExecSaisie,
    envoyerLigneShell,
    effacerSortiesExec,
  } = useExecLigneConsoleInstanceWeb({
    idInstanceWeb,
    actif: execActif,
  });

  return (
    <ConsoleFluxInstance
      titre="console — instance web"
      lignes={lignes}
      etatConnexion={etatConnexion}
      dernierMessageErreur={dernierMessageErreur}
      surEffacerFlux={effacer}
      lignesSortieExec={lignesSortieExec}
      modeSaisieExec={execActif}
      surEnvoyerLigneCommande={(ligne) => envoyerLigneShell(ligne)}
      chargementExec={chargementExec}
      erreurExecSaisie={erreurExecSaisie}
      surEffacerSortiesExec={effacerSortiesExec}
    />
  );
}
