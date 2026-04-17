import { Link } from "react-router-dom";
import { PanneauSanteEtErreurPasserelleLab } from "../lab/PanneauSanteEtErreurPasserelleLab.js";
import { SectionJournauxSseLab } from "../lab/SectionJournauxSseLab.js";
import { useGestionConteneursPasserelle } from "./GestionConteneursPasserelleProvider.js";
import { GrilleConteneursCoeurDocker } from "./GrilleConteneursCoeurDocker.js";

/**
 * Cœur Docker : supervision des conteneurs, actions rapides et accès aux journaux temps réel.
 */
export function PageCoeurDockerKidoPanel() {
  const g = useGestionConteneursPasserelle();

  return (
    <div className="kidopanel-page-centree kidopanel-page-coeur">
      <header className="kidopanel-entete-page-inline">
        <div>
          <p className="kidopanel-sur-titre">Infrastructure</p>
          <h1 className="kidopanel-titre-page">Cœur Docker</h1>
          <p className="kidopanel-sous-titre-page">
            Liste filtrée par votre compte, alignée sur la passerelle et le moteur de conteneurs.
          </p>
        </div>
        <Link to="/coeur-docker/nouveau" className="bouton-principal-kido kidopanel-lien-bouton">
          Ajouter un conteneur
        </Link>
      </header>

      <PanneauSanteEtErreurPasserelleLab
        etatSondePasserelle={g.etatSondePasserelle}
        texteSondePasserelle={g.texteSondePasserelle}
        surReverifierPasserelle={() => void g.reverifierPasserelle()}
        messageErreur={g.messageErreur}
        refUrlContexteErreur={g.refUrlContexteErreur}
      />

      <GrilleConteneursCoeurDocker
        conteneurs={g.conteneurs}
        idSelectionne={g.idSelectionne}
        surSelection={g.setIdSelectionne}
        chargementListe={g.chargementListe}
        surRafraichir={g.rafraichirListe}
        surDemarrer={(id) => void g.actionConteneur(id, "POST", "/start")}
        surArreter={(id) => void g.actionConteneur(id, "POST", "/stop")}
        surSupprimer={(id) => void g.actionConteneur(id, "DELETE", "")}
      />

      <SectionJournauxSseLab
        idSelectionne={g.idSelectionne}
        jeton={g.jetonSession}
        fluxJournauxActif={g.fluxJournauxActif}
        setFluxJournauxActif={g.setFluxJournauxActif}
      />
    </div>
  );
}
