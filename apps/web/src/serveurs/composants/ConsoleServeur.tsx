import { useConsoleServeur } from "../hooks/useConsoleServeur.js";
import { urlBasePasserelle } from "../../passerelle/url-base-passerelle.js";
import { lireJetonStockage } from "../../lab/passerelleClient.js";
import { ConsoleFluxInstance } from "../../interface/ConsoleFluxInstance.js";

type PropsConsoleServeur = {
  readonly idInstanceJeux: string;
  readonly actif: boolean;
};

/**
 * Console style terminal : flux SSE des journaux conteneur pour une instance jeu.
 */
export function ConsoleServeur({ idInstanceJeux, actif }: PropsConsoleServeur) {
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
  return (
    <ConsoleFluxInstance
      titre="console — instance jeu"
      lignes={lignes}
      etatConnexion={etatConnexion}
      dernierMessageErreur={dernierMessageErreur}
      surEffacer={effacer}
    />
  );
}
