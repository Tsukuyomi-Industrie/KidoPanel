import {
  analyserReferenceDockerLibre,
  IDENTIFIANTS_IMAGES_CATALOGUE,
} from "@kidopanel/container-catalog";
import { z } from "zod";

/** Paramètres `GET /images/suggestion` : même logique de priorité que `POST /containers` pour résoudre l’image. */
export const suggestionImageQuerySchema = z
  .object({
    imageCatalogId: z.enum(IDENTIFIANTS_IMAGES_CATALOGUE).optional(),
    imageReference: z.string().max(512).optional(),
  })
  .superRefine((donnees, ctx) => {
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
      donnees.imageCatalogId !== undefined && donnees.imageCatalogId.length > 0;
    const referencePresent =
      analyseReference !== undefined &&
      analyseReference.ok === true &&
      analyseReference.valeurNormalisee.length > 0;
    if (!cataloguePresent && !referencePresent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Indiquez « imageReference » ou « imageCatalogId » pour analyser une image Docker.",
        path: ["imageReference"],
      });
    }
  });
