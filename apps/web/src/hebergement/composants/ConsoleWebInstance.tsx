import { urlBasePasserelle } from "../../passerelle/url-base-passerelle.js";
import { lireJetonStockage } from "../../lab/passerelleClient.js";
import { useConsoleWebInstance } from "../hooks/useConsoleWebInstance.js";
import { ConsoleFluxInstance } from "../../interface/ConsoleFluxInstance.js";

type PropsConsoleWebInstance = {
  readonly idInstanceWeb: string;
  readonly actif: boolean;
};

/**
 * Console temps réel des journaux pour une instance web (SSE via `/web-instances`).
 */
export function ConsoleWebInstance({ idInstanceWeb, actif }: PropsConsoleWebInstance) {
  const jeton = lireJetonStockage();
  const { lignes, etatConnexion, dernierMessageErreur, effacer } = useConsoleWebInstance({
    urlBasePasserelle: urlBasePasserelle(),
    idInstanceWeb,
    jetonBearer: jeton,
    actif,
    tailEntrees: 500,
    lignesMaxAffichage: 500,
  });
  return (
    <ConsoleFluxInstance
      titre="console — instance web"
      lignes={lignes}
      etatConnexion={etatConnexion}
      dernierMessageErreur={dernierMessageErreur}
      surEffacer={effacer}
    />
  );
}
