import { IDENTIFIANTS_IMAGES_CATALOGUE } from "@kidopanel/container-catalog";
import { z } from "zod";
import { appliquerRefinementZodImageCatalogueOuReferenceLibre } from "./refinement-zod-image-catalogue-ou-reference-libre.js";

/** Paramètres `GET /images/suggestion` : même logique de priorité que `POST /containers` pour résoudre l’image. */
export const suggestionImageQuerySchema = z
  .object({
    imageCatalogId: z.enum(IDENTIFIANTS_IMAGES_CATALOGUE).optional(),
    imageReference: z.string().max(512).optional(),
  })
  .superRefine((donnees, ctx) =>
    appliquerRefinementZodImageCatalogueOuReferenceLibre(
      donnees,
      ctx,
      "Indiquez « imageReference » ou « imageCatalogId » pour analyser une image Docker.",
    ),
  );
