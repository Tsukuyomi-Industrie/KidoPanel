import type { ChampGabaritDockerRapide, GabaritDockerRapide } from "@kidopanel/container-catalog";
import { listeGabaritsDockerRapide } from "@kidopanel/container-catalog";
import { useCallback, useMemo, useState } from "react";
import { FormulaireGabarit } from "../interface/FormulaireGabarit.js";
import { traduireGabaritDockerRapideVersCorpsApi } from "./traducteur-gabarit-docker-rapide-vers-api.js";

function construireValeursInitialesDepuisChamps(
  champs: readonly ChampGabaritDockerRapide[],
): Record<string, string> {
  const sortie: Record<string, string> = {};
  for (const champ of champs) {
    sortie[champ.cle] = champ.defaut ?? "";
  }
  return sortie;
}

function etiquetteCategorieVersLibelle(
  categorie: GabaritDockerRapide["categorie"],
): string {
  switch (categorie) {
    case "web":
      return "Web";
    case "base-de-donnees":
      return "Base de données";
    case "runtime":
      return "Runtime";
    case "cache":
      return "Cache";
    default:
      return categorie;
  }
}

/** Repère visuel distinct par grande famille de gabarit sur la grille de sélection. */
function pictogrammeCategorieGabaritRapide(categorie: GabaritDockerRapide["categorie"]): string {
  switch (categorie) {
    case "web":
      return "🌐";
    case "base-de-donnees":
      return "🗄";
    case "runtime":
      return "⚙";
    default:
      return "⚡";
  }
}

type PropsModeRapide = {
  readonly surCreerConteneur: (corps: Record<string, unknown>) => Promise<boolean>;
  readonly messageErreurExterne: string | null;
  readonly surErreurTraduction: (message: string | null) => void;
};

/**
 * Étape guidée : cartes de gabarits Docker rapides puis formulaire générique sans JSON.
 */
export function ModeGabaritRapideCreationConteneur({
  surCreerConteneur,
  messageErreurExterne,
  surErreurTraduction,
}: PropsModeRapide) {
  const gabarits = useMemo(() => listeGabaritsDockerRapide(), []);
  const [etape, setEtape] = useState<1 | 2>(1);
  const [gabaritChoisi, setGabaritChoisi] = useState<GabaritDockerRapide | null>(
    null,
  );
  const [enCours, setEnCours] = useState(false);

  const valeursInitiales = useMemo(() => {
    if (gabaritChoisi === null) {
      return {};
    }
    return construireValeursInitialesDepuisChamps(gabaritChoisi.champsFormulaire);
  }, [gabaritChoisi]);

  const choisirGabarit = useCallback((g: GabaritDockerRapide) => {
    setGabaritChoisi(g);
    setEtape(2);
    surErreurTraduction(null);
  }, [surErreurTraduction]);

  const retourListe = useCallback(() => {
    setEtape(1);
    setGabaritChoisi(null);
    surErreurTraduction(null);
  }, [surErreurTraduction]);

  const gererSoumissionFormulaire = useCallback(
    async (valeurs: Record<string, string>) => {
      if (gabaritChoisi === null) {
        return;
      }
      surErreurTraduction(null);
      let corps: Record<string, unknown>;
      try {
        corps = traduireGabaritDockerRapideVersCorpsApi({
          gabarit: gabaritChoisi,
          valeursChamps: valeurs,
        });
      } catch (error_) {
        surErreurTraduction(
          error_ instanceof Error ? error_.message : "Préparation du corps de création invalide.",
        );
        return;
      }
      setEnCours(true);
      try {
        await surCreerConteneur(corps);
      } finally {
        setEnCours(false);
      }
    },
    [gabaritChoisi, surCreerConteneur, surErreurTraduction],
  );

  if (etape === 1) {
    return (
      <div className="kp-grille-cartes-gabarits">
        {gabarits.map((g) => (
          <article key={g.id} className="kp-carte-selection-gabarit">
            <span className="kp-carte-selection-gabarit__icone" aria-hidden="true">
              {pictogrammeCategorieGabaritRapide(g.categorie)}
            </span>
            <span className="kp-carte-selection-gabarit__badge">
              {etiquetteCategorieVersLibelle(g.categorie)}
            </span>
            <h2 className="kp-creation-catalogue-fiche__id">{g.nom}</h2>
            <p className="kidopanel-texte-muted">{g.description}</p>
            <p className="kp-texte-muted kp-marges-haut-sm">
              Mémoire suggérée : {Math.round(g.memoireRecommandeMb / 1024)} Go RAM
            </p>
            <button
              type="button"
              className="bouton-principal-kido"
              onClick={() => choisirGabarit(g)}
            >
              Choisir
            </button>
          </article>
        ))}
      </div>
    );
  }

  if (gabaritChoisi === null) {
    return null;
  }

  return (
    <div>
      <button type="button" className="bouton-secondaire-kido" onClick={retourListe}>
        Retour au choix du gabarit
      </button>
      <h2 className="kidopanel-titre-page" style={{ marginTop: "1rem", fontSize: "1.15rem" }}>
        {gabaritChoisi.nom}
      </h2>
      <p className="kidopanel-texte-muted">{gabaritChoisi.description}</p>
      <FormulaireGabarit
        champs={gabaritChoisi.champsFormulaire}
        valeursInitiales={valeursInitiales}
        libelleAction="Créer le conteneur"
        enCours={enCours}
        messageErreur={messageErreurExterne}
        onSubmit={(v) => gererSoumissionFormulaire(v)}
      />
    </div>
  );
}
