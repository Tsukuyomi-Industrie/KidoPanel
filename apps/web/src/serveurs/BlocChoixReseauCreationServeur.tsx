import { useEffect, useState } from "react";
import {
  listerReseauxInternesPasserelle,
  type EnregistrementReseauInternePasserelle,
} from "../passerelle/serviceReseauxInternesPasserelle.js";
import type { StrategieReseauCreationInstanceJeux } from "./traducteur-formulaire-vers-api.js";

type PropsBlocChoixReseauCreationServeur = {
  readonly strategie: StrategieReseauCreationInstanceJeux;
  readonly surStrategie: (v: StrategieReseauCreationInstanceJeux) => void;
  readonly idReseauSelectionne: string;
  readonly surIdReseauSelectionne: (id: string) => void;
  readonly primaireKidopanel: boolean;
  readonly surPrimaireKidopanel: (v: boolean) => void;
};

/** Placeholder du sélecteur de pont lorsque la liste panel est vide ou encore chargée. */
function libellePlaceholderListePontServeur(chargement: boolean, nombrePonts: number): string {
  if (chargement) return "Chargement…";
  if (nombrePonts === 0) return "Aucun pont : créez-en un (menu réseaux)";
  return "Choisir…";
}

/**
 * Choix du réseau Docker pour une instance jeu : pont partagé, pont personnel, ou les deux.
 */
export function BlocChoixReseauCreationServeur({
  strategie,
  surStrategie,
  idReseauSelectionne,
  surIdReseauSelectionne,
  primaireKidopanel,
  surPrimaireKidopanel,
}: PropsBlocChoixReseauCreationServeur) {
  const [liste, setListe] = useState<EnregistrementReseauInternePasserelle[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreurListe, setErreurListe] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const r = await listerReseauxInternesPasserelle();
        if (!annule) {
          setListe(r);
          setErreurListe(null);
        }
      } catch (error_) {
        if (!annule) {
          setErreurListe(error_ instanceof Error ? error_.message : "Liste réseaux indisponible.");
        }
      } finally {
        if (!annule) {
          setChargement(false);
        }
      }
    })().catch(() => {});
    return () => {
      annule = true;
    };
  }, []);

  return (
    <fieldset className="kp-fieldset-section" style={{ marginTop: "1rem" }}>
      <legend>Réseau du serveur</legend>
      <p className="kp-champ__aide">
        Par défaut le conteneur utilise le réseau partagé du panel. Vous pouvez le placer uniquement sur un pont que vous avez créé, ou sur les deux à la fois.
      </p>
      {erreurListe === null ? null : (
        <p className="bandeau-erreur-auth" role="alert">
          {erreurListe}
        </p>
      )}
      <div className="kp-champ">
        <span className="kp-champ__label">Stratégie</span>
        <div className="kp-champ kp-champ--horizontal" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
          <label>
            <input
              type="radio"
              name="kp-srv-strat-reseau"
              checked={strategie === "kidopanel_seul"}
              onChange={() => {
                surStrategie("kidopanel_seul");
              }}
            />{" "}
            Réseau KidoPanel uniquement
          </label>
          <label>
            <input
              type="radio"
              name="kp-srv-strat-reseau"
              checked={strategie === "pont_utilisateur_seul"}
              onChange={() => {
                surStrategie("pont_utilisateur_seul");
              }}
            />{" "}
            Mon pont uniquement
          </label>
          <label>
            <input
              type="radio"
              name="kp-srv-strat-reseau"
              checked={strategie === "kidopanel_et_pont_utilisateur"}
              onChange={() => {
                surStrategie("kidopanel_et_pont_utilisateur");
              }}
            />{" "}
            KidoPanel et mon pont
          </label>
        </div>
      </div>
      {(strategie === "pont_utilisateur_seul" ||
        strategie === "kidopanel_et_pont_utilisateur") && (
        <div className="kp-champ">
          <label className="kp-champ__label kp-champ__label--requis" htmlFor="kp-srv-reseau-liste">
            Pont créé dans le panel
          </label>
          <select
            id="kp-srv-reseau-liste"
            value={idReseauSelectionne}
            disabled={chargement || liste.length === 0}
            onChange={(e) => {
              surIdReseauSelectionne(e.target.value);
            }}
          >
            <option value="">
              {libellePlaceholderListePontServeur(chargement, liste.length)}
            </option>
            {liste.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nomAffichage} ({r.sousReseauCidr})
              </option>
            ))}
          </select>
        </div>
      )}
      {strategie === "kidopanel_et_pont_utilisateur" ? (
        <div className="kp-champ kp-champ--horizontal">
          <label className="kp-champ__label" htmlFor="kp-srv-primaire-kido">
            Réseau principal à la création (carte réseau par défaut du conteneur)
          </label>
          <input
            id="kp-srv-primaire-kido"
            type="checkbox"
            checked={primaireKidopanel}
            onChange={(e) => {
              surPrimaireKidopanel(e.target.checked);
            }}
          />
          <span className="kp-champ__aide">Coché : KidoPanel d’abord, puis votre pont. Décoché : l’inverse.</span>
        </div>
      ) : null}
    </fieldset>
  );
}
