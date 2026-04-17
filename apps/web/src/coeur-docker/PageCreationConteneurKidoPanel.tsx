import { Link } from "react-router-dom";
import { BandeauErreurPasserelleKidoPanel } from "../interface/BandeauErreurPasserelleKidoPanel.js";
import { SectionCreationConteneurAvanceLab } from "../lab/SectionCreationConteneurAvanceLab.js";
import { useGestionConteneursPasserelle } from "./GestionConteneursPasserelleProvider.js";

/**
 * Assistant de création : accès principal depuis le cœur Docker, formulaire avancé et bandeau d’erreur seul.
 */
export function PageCreationConteneurKidoPanel() {
  const g = useGestionConteneursPasserelle();

  return (
    <div className="kidopanel-page-centree kidopanel-page-creation kp-creation-page">
      <header className="kp-creation-page__hero">
        <nav className="kidopanel-fil-ariane kp-creation-page__fil" aria-label="Fil d’Ariane">
          <Link to="/coeur-docker">Cœur Docker</Link>
          <span aria-hidden="true"> / </span>
          <span>Nouveau conteneur</span>
        </nav>
        <h1 className="kp-creation-page__titre">Nouveau conteneur</h1>
        <p className="kp-creation-page__sous">
          Image issue du catalogue contrôlé, paramètres alignés sur l’API Docker : validation côté passerelle
          puis moteur.
        </p>
        <Link to="/coeur-docker" className="bouton-secondaire-kido kidopanel-lien-bouton-secondaire">
          Retour au cœur Docker
        </Link>
      </header>

      <BandeauErreurPasserelleKidoPanel
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
