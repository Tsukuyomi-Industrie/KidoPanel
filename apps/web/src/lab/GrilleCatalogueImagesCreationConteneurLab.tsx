import type { ImageCatalogueApi } from "@kidopanel/container-catalog";

type Props = {
  readonly images: ImageCatalogueApi[];
  readonly identifiantSelectionne: string;
  readonly surSelection: (id: string) => void;
  readonly interactionDesactivee: boolean;
};

/** Libellé court pour l’affichage de la catégorie métier dans le lab. */
export function libelleCategorieImageCatalogueLab(
  categorie: ImageCatalogueApi["categorie"],
): string {
  switch (categorie) {
    case "web":
      return "Web";
    case "db":
      return "Base de données";
    case "runtime":
      return "Runtime";
    case "utilitaire":
      return "Utilitaire";
    default:
      return categorie;
  }
}

/**
 * Grille de cartes pour choisir une entrée du catalogue officiel ;
 * complète la liste déroulante sans la remplacer pour les usages compacts ou lecteurs d’écran.
 */
export function GrilleCatalogueImagesCreationConteneurLab({
  images,
  identifiantSelectionne,
  surSelection,
  interactionDesactivee,
}: Props) {
  if (images.length === 0) {
    return null;
  }

  return (
    <ul className="kp-creation-catalogue-grille" aria-label="Catalogue d’images officielles">
      {images.map((img) => {
        const actif = img.id === identifiantSelectionne;
        return (
          <li key={img.id} className="kp-creation-catalogue-grille__cellule">
            <button
              type="button"
              className={
                actif
                  ? "kp-creation-catalogue-fiche kp-creation-catalogue-fiche--actif"
                  : "kp-creation-catalogue-fiche"
              }
              disabled={interactionDesactivee}
              onClick={() => {
                surSelection(img.id);
              }}
            >
              <span className="kp-creation-catalogue-fiche__id">{img.id}</span>
              <span className="kp-creation-catalogue-fiche__cat">
                {libelleCategorieImageCatalogueLab(img.categorie)}
              </span>
              <code className="kp-creation-catalogue-fiche__ref">{img.referenceDocker}</code>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
