import type { ImageCatalogueApi } from "@kidopanel/container-catalog";
import type { ReactNode } from "react";
import type { EtatCreationConteneurLab } from "./etatCreationConteneurLab.js";
import {
  GrilleCatalogueImagesCreationConteneurLab,
  libelleCategorieImageCatalogueLab,
} from "./GrilleCatalogueImagesCreationConteneurLab.js";
import { AIDE_IMAGE_REFERENCE } from "./definitionsAidesCreationConteneurLab.js";
import {
  styleChampTexteCreation,
  styleLabelChampCreation,
  styleTitreChampCreation,
} from "./stylesFormulaireCreationConteneurLab.js";
import { TexteAideChampCreationConteneurLab } from "./TexteAideChampCreationConteneurLab.js";

type Props = {
  readonly etat: EtatCreationConteneurLab;
  readonly majEtat: (partiel: Partial<EtatCreationConteneurLab>) => void;
  readonly jetonSession: string;
  readonly imagesCatalogue: ImageCatalogueApi[];
  readonly chargementCatalogue: boolean;
  readonly erreurCatalogue: string | null;
};

/**
 * Sélection d’image strictement issue du catalogue KidoPanel (aucune référence Docker libre dans le formulaire).
 */
export function SousBlocChoixImageDockerCreationConteneurLab({
  etat,
  majEtat,
  jetonSession,
  imagesCatalogue,
  chargementCatalogue,
  erreurCatalogue,
}: Props) {
  const selection = imagesCatalogue.find((x) => x.id === etat.imageCatalogId);

  let contenuListeDeroulanteCatalogue: ReactNode;
  if (jetonSession.trim() === "") {
    contenuListeDeroulanteCatalogue = (
      <option value="">Connexion requise pour lister les images</option>
    );
  } else if (chargementCatalogue) {
    contenuListeDeroulanteCatalogue = <option value="">Chargement du catalogue…</option>;
  } else if (imagesCatalogue.length === 0) {
    contenuListeDeroulanteCatalogue = (
      <option value="">Aucune image catalogue (vérifiez la connexion)</option>
    );
  } else {
    contenuListeDeroulanteCatalogue = imagesCatalogue.map((img) => (
      <option key={img.id} value={img.id}>
        {img.id} — {img.referenceDocker}
      </option>
    ));
  }

  return (
    <div style={styleLabelChampCreation}>
      <span style={styleTitreChampCreation} id="kp-catalogue-image-titre">
        Image du catalogue (`imageCatalogId`)
      </span>
      <TexteAideChampCreationConteneurLab texte={AIDE_IMAGE_REFERENCE} />
      <GrilleCatalogueImagesCreationConteneurLab
        images={imagesCatalogue}
        identifiantSelectionne={etat.imageCatalogId}
        interactionDesactivee={
          chargementCatalogue ||
          jetonSession.trim() === "" ||
          imagesCatalogue.length === 0
        }
        surSelection={(id) => {
          majEtat({ origineImage: "catalogue", imageCatalogId: id });
        }}
      />
      <p className="kp-creation-catalogue-select-hint">
        Identifiant officiel utilisé dans le corps JSON envoyé au moteur (ex. nginx, postgres).
      </p>
      <select
        aria-labelledby="kp-catalogue-image-titre"
        value={
          imagesCatalogue.some((x) => x.id === etat.imageCatalogId)
            ? etat.imageCatalogId
            : ""
        }
        onChange={(e) => {
          const v = e.target.value;
          if (v.length > 0) {
            majEtat({ origineImage: "catalogue", imageCatalogId: v });
          }
        }}
        disabled={
          chargementCatalogue ||
          jetonSession.trim().length === 0 ||
          imagesCatalogue.length === 0
        }
        style={styleChampTexteCreation}
      >
        {contenuListeDeroulanteCatalogue}
      </select>
      {erreurCatalogue !== null ? (
        <p style={{ fontSize: "0.85rem", color: "#b00020", marginTop: 6 }}>
          {erreurCatalogue}
        </p>
      ) : null}
      {selection !== undefined ? (
        <div
          style={{
            marginTop: 8,
            fontSize: "0.88rem",
            opacity: 0.92,
            lineHeight: 1.45,
          }}
        >
          <div>
            <strong>Catégorie :</strong>{" "}
            {libelleCategorieImageCatalogueLab(selection.categorie)}
          </div>
          <div style={{ marginTop: 4 }}>
            <strong>Description :</strong> {selection.description}
          </div>
          <div style={{ marginTop: 4 }}>
            <strong>Référence Docker résolue par le moteur :</strong>{" "}
            <code>{selection.referenceDocker}</code>
          </div>
        </div>
      ) : null}
    </div>
  );
}
