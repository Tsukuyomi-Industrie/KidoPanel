import {
  useFluxJournauxConteneur,
  type OptionsFluxJournauxConteneur,
} from "../../hooks/useFluxJournauxConteneur.js";

type OptionsSansIdFlux = Omit<
  OptionsFluxJournauxConteneur,
  "idConteneur" | "varianteFlux"
>;

/**
 * Flux SSE console pour une instance jeu : relais passerelle `/serveurs-jeux/instances/…/logs/stream`.
 */
export function useConsoleServeur(
  params: OptionsSansIdFlux & { idInstanceJeux: string },
): ReturnType<typeof useFluxJournauxConteneur> {
  const { idInstanceJeux, ...rest } = params;
  return useFluxJournauxConteneur({
    ...rest,
    idConteneur: idInstanceJeux,
    varianteFlux: "instanceServeurJeu",
  });
}
