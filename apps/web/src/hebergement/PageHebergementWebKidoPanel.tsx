import { EtatVide } from "../interface/EtatVide.js";
import { IcoHebergement } from "../interface/icones/IcoHebergement.js";

/**
 * Point d’entrée « Hébergement web » : périmètre prévu dans la feuille de route, hors métier disponible pour l’instant.
 */
export function PageHebergementWebKidoPanel() {
  return (
    <>
      <div className="kp-page-entete">
        <div>
          <h1 className="kp-page-titre">Hébergement web</h1>
          <p className="kp-page-sous-titre">
            Instances web et piles applicatives orchestrées depuis KidoPanel.
          </p>
        </div>
      </div>
      <EtatVide
        titre="Fonctionnalité à venir"
        detail="Les gabarits web et le cycle de vie associé seront branchés sur la passerelle dans une itération ultérieure du produit."
        icone={<IcoHebergement className="kp-etat-vide__ico" size={48} />}
      />
    </>
  );
}
