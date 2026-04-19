import { Link } from "react-router-dom";
import { BandeauErreurPasserelleKidoPanel } from "../interface/BandeauErreurPasserelleKidoPanel.js";
import { SectionJournauxSseLab } from "../lab/SectionJournauxSseLab.js";
import { useGestionConteneursPasserelle } from "./GestionConteneursPasserelleProvider.js";
import { GrilleConteneursCoeurDocker } from "./GrilleConteneursCoeurDocker.js";

/**
 * Cœur Docker : liste des conteneurs, actions et journaux repliables ; erreurs réseau sans sonde HTTP visible.
 */
export function PageCoeurDockerKidoPanel() {
  const g = useGestionConteneursPasserelle();

  return (
    <div className="kidopanel-page-centree kidopanel-page-coeur">
      <div className="kp-encart-contexte-flux" role="note" style={{ marginBottom: "1rem" }}>
        <strong>Cœur Docker — mode expert</strong>
        <p style={{ margin: "0.35rem 0 0" }}>
          Ce module permet de créer et gérer des containers Docker avec un contrôle total sur leur configuration. Pour
          déployer un serveur de jeu (Minecraft, Valheim, etc.), utilisez plutôt la section « Serveurs de jeu » du menu
          principal.
        </p>
      </div>

      <header className="kidopanel-entete-page-inline">
        <div>
          <p className="kidopanel-sur-titre">Infrastructure</p>
          <h1 className="kidopanel-titre-page">Cœur Docker</h1>
          <p className="kidopanel-sous-titre-page">
            Liste des instances Docker filtrée par votre compte via la passerelle et le moteur.
          </p>
        </div>
        <Link to="/coeur-docker/nouveau" className="bouton-principal-kido kidopanel-lien-bouton">
          Créer une instance
        </Link>
      </header>

      <BandeauErreurPasserelleKidoPanel
        messageErreur={g.messageErreur}
        refUrlContexteErreur={g.refUrlContexteErreur}
      />

      <GrilleConteneursCoeurDocker
        conteneurs={g.conteneurs}
        idSelectionne={g.idSelectionne}
        surSelection={g.setIdSelectionne}
        chargementListe={g.chargementListe}
        surRafraichir={g.rafraichirListe}
        surDemarrer={(id) => {
          g.actionConteneur(id, "POST", "/start").catch(() => {});
        }}
        surArreter={(id) => {
          g.actionConteneur(id, "POST", "/stop").catch(() => {});
        }}
        surSupprimer={(id) => {
          g.actionConteneur(id, "DELETE", "").catch(() => {});
        }}
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
