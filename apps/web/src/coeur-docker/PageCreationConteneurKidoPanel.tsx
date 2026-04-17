import { Link } from "react-router-dom";
import { SectionCreationConteneurAvanceLab } from "../lab/SectionCreationConteneurAvanceLab.js";
import { PanneauSanteEtErreurPasserelleLab } from "../lab/PanneauSanteEtErreurPasserelleLab.js";
import { useGestionConteneursPasserelle } from "./GestionConteneursPasserelleProvider.js";

/**
 * Assistant de création : même moteur de validation que l’ancien formulaire, présentation cartographiée.
 */
export function PageCreationConteneurKidoPanel() {
  const g = useGestionConteneursPasserelle();

  return (
    <div className="kidopanel-page-centree kidopanel-page-creation">
      <nav className="kidopanel-fil-ariane" aria-label="Fil d’Ariane">
        <Link to="/coeur-docker">Cœur Docker</Link>
        <span aria-hidden="true"> / </span>
        <span>Nouveau conteneur</span>
      </nav>

      <header className="kidopanel-hero-tableau kidopanel-hero-compact">
        <h1 className="kidopanel-titre-page">Création de conteneur</h1>
        <p className="kidopanel-sous-titre-page">
          Paramètres alignés sur l’API Docker : validation côté passerelle et moteur, catalogue d’images
          contrôlé.
        </p>
        <Link to="/coeur-docker" className="bouton-secondaire-kido kidopanel-lien-bouton-secondaire">
          Retour au cœur Docker
        </Link>
      </header>

      <PanneauSanteEtErreurPasserelleLab
        etatSondePasserelle={g.etatSondePasserelle}
        texteSondePasserelle={g.texteSondePasserelle}
        surReverifierPasserelle={() => void g.reverifierPasserelle()}
        messageErreur={g.messageErreur}
        refUrlContexteErreur={g.refUrlContexteErreur}
      />

      <div className="kidopanel-grille-creation">
        <SectionCreationConteneurAvanceLab
          etat={g.etatCreation}
          majEtat={g.majEtatCreation}
          surCreer={() => void g.surCreer()}
          surRemplirFormulaire={g.remplirFormulaireCreation}
          surErreurConfiguration={(msg) => g.setMessageErreur(msg)}
          jetonSession={g.jetonSession}
          masquerParagrapheDocumentationApi
        />
      </div>
    </div>
  );
}
