import { analyserReferenceDockerLibre } from "@kidopanel/container-catalog";
import { z } from "zod";

/**
 * Validation croisée catalogue KidoPanel vs référence Docker libre (priorité au catalogue si les deux sont présents).
 */
export function appliquerRefinementZodImageCatalogueOuReferenceLibre(
  donnees: {
    imageReference?: unknown;
    imageCatalogId?: unknown;
  },
  ctx: {
    addIssue: (issue: {
      code: typeof z.ZodIssueCode.custom;
      message: string;
      path: string[];
    }) => void;
  },
  messageSiNiCatalogueNiReference: string,
): void {
  const analyseReference =
    donnees.imageReference !== undefined &&
    typeof donnees.imageReference === "string" &&
    donnees.imageReference.trim().length > 0
      ? analyserReferenceDockerLibre(donnees.imageReference)
      : undefined;
  if (analyseReference !== undefined && analyseReference.ok === false) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: analyseReference.message,
      path: ["imageReference"],
    });
    return;
  }
  const cataloguePresent =
    donnees.imageCatalogId !== undefined &&
    typeof donnees.imageCatalogId === "string" &&
    donnees.imageCatalogId.length > 0;
  const referencePresent =
    analyseReference !== undefined &&
    analyseReference.ok === true &&
    analyseReference.valeurNormalisee.length > 0;
  if (!cataloguePresent && !referencePresent) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: messageSiNiCatalogueNiReference,
      path: ["imageReference"],
    });
  }
}
