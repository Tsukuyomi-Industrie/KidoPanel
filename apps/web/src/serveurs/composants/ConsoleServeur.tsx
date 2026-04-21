import { useConsoleServeur } from "../hooks/useConsoleServeur.js";
import { useExecLigneConsoleInstanceServeur } from "../hooks/useExecLigneConsoleInstanceServeur.js";
import { urlBasePasserelle } from "../../passerelle/url-base-passerelle.js";
import { lireJetonStockage } from "../../lab/passerelleClient.js";
import { ConsoleFluxInstance } from "../../interface/ConsoleFluxInstance.js";

type PropsConsoleServeur = {
  readonly idInstanceJeux: string;
  readonly actif: boolean;
  readonly execDisponible: boolean;
};

/**
 * Console : flux SSE Docker et saisie `exec` lorsque le conteneur existe.
 */
export function ConsoleServeur({
  idInstanceJeux,
  actif,
  execDisponible,
}: PropsConsoleServeur) {
  const jeton = lireJetonStockage();
  const { lignes, etatConnexion, dernierMessageErreur, effacer } =
    useConsoleServeur({
      urlBasePasserelle: urlBasePasserelle(),
      idInstanceJeux,
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
  } = useExecLigneConsoleInstanceServeur({
    idInstanceJeux,
    actif: execActif,
  });

  return (
    <ConsoleFluxInstance
      titre="console — instance jeu"
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
