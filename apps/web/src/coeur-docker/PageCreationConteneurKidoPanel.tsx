import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BandeauErreurPasserelleKidoPanel } from "../interface/BandeauErreurPasserelleKidoPanel.js";
import { FormulaireExpertCreationConteneur } from "./FormulaireExpertCreationConteneur.js";
import {
  etatInitialFormulaireExpertConteneur,
  type EtatFormulaireExpertConteneur,
} from "./etat-formulaire-expert-conteneur.js";
import { useGestionConteneursPasserelle } from "./GestionConteneursPasserelleProvider.js";
import { ModeGabaritRapideCreationConteneur } from "./ModeGabaritRapideCreationConteneur.js";
import { traduireFormulaireExpertVersCorpsApi } from "./traducteur-formulaire-expert-vers-api.js";

/**
 * Création conteneur : gabarit rapide (catalogue structuré) ou configuration experte sans JSON libre.
 */
export function PageCreationConteneurKidoPanel() {
  const g = useGestionConteneursPasserelle();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"rapide" | "expert">("rapide");
  const [etatExpert, setEtatExpert] = useState<EtatFormulaireExpertConteneur>(() =>
    etatInitialFormulaireExpertConteneur(),
  );
  const [erreurTraductionExpert, setErreurTraductionExpert] = useState<string | null>(
    null,
  );
  const [erreurTraductionRapide, setErreurTraductionRapide] = useState<string | null>(
    null,
  );
  const [enCoursExpert, setEnCoursExpert] = useState(false);

  const posterRapide = useCallback(
    async (corps: Record<string, unknown>) => {
      const ok = await g.surPosterCreationConteneurJson(corps);
      if (ok) {
        navigate("/coeur-docker");
      }
      return ok;
    },
    [g, navigate],
  );

  const soumettreExpert = useCallback(async () => {
    setErreurTraductionExpert(null);
    let corps: Record<string, unknown>;
    try {
      corps = traduireFormulaireExpertVersCorpsApi(etatExpert);
    } catch (error_) {
      setErreurTraductionExpert(
        error_ instanceof Error ? error_.message : "Configuration invalide.",
      );
      return;
    }
    setEnCoursExpert(true);
    try {
      const ok = await g.surPosterCreationConteneurJson(corps);
      if (ok) {
        navigate("/coeur-docker");
      }
    } finally {
      setEnCoursExpert(false);
    }
  }, [etatExpert, g, navigate]);

  return (
    <div className="kidopanel-page-centree kidopanel-page-creation kp-creation-page">
      <header className="kp-creation-page__hero">
        <nav className="kp-creation-page__fil" aria-label="Fil d'Ariane">
          <Link to="/coeur-docker">Cœur Docker</Link>
          <span aria-hidden="true"> / </span>
          <span>Nouveau conteneur</span>
        </nav>
        <h1 className="kp-creation-page__titre">Créer un conteneur</h1>
        <p className="kp-creation-page__sous">
          Gabarits rapides pour les usages courants, ou mode expert pour une image et une configuration Docker
          complètes sans saisir de JSON brut.
        </p>
        <Link to="/coeur-docker" className="bouton-secondaire-kido kidopanel-lien-bouton-secondaire">
          Retour au cœur Docker
        </Link>
      </header>

      <div className="kp-encart-contexte-flux" role="note">
        <strong>Cœur Docker — mode expert</strong>
        <p style={{ margin: "0.35rem 0 0" }}>
          Ce module permet de créer et gérer des containers Docker avec un contrôle total sur leur configuration.
          Pour déployer un serveur de jeu (Minecraft, Valheim, etc.), utilisez plutôt la section « Serveurs de jeu » du
          menu principal.
        </p>
      </div>

      <BandeauErreurPasserelleKidoPanel
        messageErreur={g.messageErreur}
        refUrlContexteErreur={g.refUrlContexteErreur}
      />

      <fieldset className="kp-toggle-mode-creation">
        <legend className="kp-toggle-mode-creation__legende">Mode de création</legend>
        <button
          type="button"
          className={mode === "rapide" ? "kp-toggle-mode-creation--actif" : undefined}
          onClick={() => setMode("rapide")}
        >
          Gabarit rapide
        </button>
        <button
          type="button"
          className={mode === "expert" ? "kp-toggle-mode-creation--actif" : undefined}
          onClick={() => setMode("expert")}
        >
          Configuration experte
        </button>
      </fieldset>

      <div className="kp-creation-racine">
        {mode === "rapide" ? (
          <ModeGabaritRapideCreationConteneur
            surCreerConteneur={posterRapide}
            messageErreurExterne={erreurTraductionRapide}
            surErreurTraduction={setErreurTraductionRapide}
          />
        ) : (
          <FormulaireExpertCreationConteneur
            etat={etatExpert}
            surChangement={setEtatExpert}
            libelleSoumission="Créer le conteneur"
            enCours={enCoursExpert}
            messageErreur={erreurTraductionExpert}
            surSoumettre={() => soumettreExpert()}
          />
        )}
      </div>
    </div>
  );
}
