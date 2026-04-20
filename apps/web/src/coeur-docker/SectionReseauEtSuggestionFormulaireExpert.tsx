import { useCallback, useEffect, useState } from "react";
import {
  chargerSuggestionConfigurationImageDocker,
} from "../passerelle/serviceSuggestionImageDockerPasserelle.js";
import {
  listerReseauxInternesPasserelle,
  type EnregistrementReseauInternePasserelle,
} from "../passerelle/serviceReseauxInternesPasserelle.js";
import type { EtatFormulaireExpertConteneur } from "./etat-formulaire-expert-conteneur.js";

type PropsSectionReseauEtSuggestion = {
  readonly etat: EtatFormulaireExpertConteneur;
  readonly surChangement: (suivant: EtatFormulaireExpertConteneur) => void;
};

function parserClePortExposee(cle: string): {
  portConteneur: string;
  protocole: "tcp" | "udp";
} {
  const partie = cle.split("/");
  const port = partie[0]?.trim() ?? "";
  const proto = partie[1]?.toLowerCase() === "udp" ? "udp" : "tcp";
  return { portConteneur: port, protocole: proto };
}

function cleDedupPortConteneur(l: {
  portConteneur: string;
  protocole: "tcp" | "udp";
}): string {
  return `${l.portConteneur.trim()}/${l.protocole}`;
}

function appliquerPortsSuggeresAbsents(
  lignesPorts: EtatFormulaireExpertConteneur["lignesPorts"],
  exposedPorts: string[],
): EtatFormulaireExpertConteneur["lignesPorts"] {
  const nvPorts = [...lignesPorts];
  const portsDeja = new Set(
    nvPorts
      .filter((l) => l.portConteneur.trim().length > 0)
      .map((l) => cleDedupPortConteneur(l)),
  );
  for (const cle of exposedPorts) {
    const { portConteneur, protocole } = parserClePortExposee(cle);
    if (portConteneur.length === 0) {
      continue;
    }
    const idDedup = cleDedupPortConteneur({ portConteneur, protocole });
    if (portsDeja.has(idDedup)) {
      continue;
    }
    portsDeja.add(idDedup);
    nvPorts.push({
      id: crypto.randomUUID(),
      portConteneur,
      portHote: "0",
      protocole,
    });
  }
  return nvPorts;
}

function appliquerVariablesEnvSuggereesAbsentes(
  lignesEnv: EtatFormulaireExpertConteneur["lignesEnv"],
  envSuggere: Record<string, string>,
): EtatFormulaireExpertConteneur["lignesEnv"] {
  const nvEnv = [...lignesEnv];
  const clesDeja = new Set(nvEnv.map((l) => l.cle.trim()));
  for (const [cle, valeur] of Object.entries(envSuggere)) {
    if (!clesDeja.has(cle)) {
      nvEnv.push({
        id: crypto.randomUUID(),
        cle,
        valeur,
      });
    }
  }
  return nvEnv;
}

/** Libellé du placeholder du sélecteur de pont utilisateur lorsque les données sont en cours ou absentes. */
function libelleOptionPontFormulaireExpertDefaut(
  chargementPonts: boolean,
  nombrePonts: number,
): string {
  if (chargementPonts) return "Chargement…";
  if (nombrePonts === 0) return "Aucun pont : créez-en un via /reseaux-internes";
  return "Choisir un pont…";
}

/**
 * Préremplissage depuis l’inspection Docker et choix des ponts KidoPanel (mode bridge).
 */
export function SectionReseauEtSuggestionFormulaireExpert({
  etat,
  surChangement,
}: PropsSectionReseauEtSuggestion) {
  const [listePonts, setListePonts] = useState<EnregistrementReseauInternePasserelle[]>([]);
  const [chargementPonts, setChargementPonts] = useState(true);
  const [erreurPonts, setErreurPonts] = useState<string | null>(null);
  const [chargementSuggestion, setChargementSuggestion] = useState(false);
  const [messageSuggestion, setMessageSuggestion] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const r = await listerReseauxInternesPasserelle();
        if (!annule) {
          setListePonts(r);
          setErreurPonts(null);
        }
      } catch (error_) {
        if (!annule) {
          setErreurPonts(error_ instanceof Error ? error_.message : "Liste des ponts indisponible.");
        }
      } finally {
        if (!annule) {
          setChargementPonts(false);
        }
      }
    })().catch(() => {});
    return () => {
      annule = true;
    };
  }, []);

  const appliquerSuggestionImage = useCallback(async () => {
    setMessageSuggestion(null);
    setChargementSuggestion(true);
    try {
      const ref = etat.imageDocker.trim();
      const suggestion = await chargerSuggestionConfigurationImageDocker({
        imageReference: ref,
      });
      const nvPorts = appliquerPortsSuggeresAbsents(
        etat.lignesPorts,
        suggestion.exposedPorts ?? [],
      );
      const nvEnv = appliquerVariablesEnvSuggereesAbsentes(
        etat.lignesEnv,
        suggestion.env ?? {},
      );
      const cmdTxt =
        suggestion.cmd !== undefined && suggestion.cmd.length > 0
          ? suggestion.cmd.join(" ")
          : etat.commandeDemarrage;
      const epTxt =
        suggestion.entrypoint !== undefined && suggestion.entrypoint.length > 0
          ? suggestion.entrypoint.join(" ")
          : etat.entrypointDocker;
      surChangement({
        ...etat,
        entrypointDocker: epTxt,
        commandeDemarrage: cmdTxt,
        repertoireTravailDocker:
          suggestion.workingDir?.trim() ?? etat.repertoireTravailDocker,
        lignesPorts: nvPorts,
        lignesEnv: nvEnv,
      });
      setMessageSuggestion(
        suggestion.avertissements.length > 0
          ? suggestion.avertissements.join(" ")
          : "Suggestion appliquée à partir du manifeste d’image.",
      );
    } catch (error_) {
      setMessageSuggestion(error_ instanceof Error ? error_.message : "Suggestion impossible.");
    } finally {
      setChargementSuggestion(false);
    }
  }, [etat, surChangement]);

  const majPontSelectionne = useCallback(
    (idSelection: string) => {
      const trouve = listePonts.find((p) => p.id === idSelection);
      surChangement({
        ...etat,
        nomDockerPontUtilisateur: trouve?.nomDocker ?? "",
      });
    },
    [etat, listePonts, surChangement],
  );

  return (
    <>
      <div className="kp-champ">
        <button
          type="button"
          className="bouton-secondaire-kido"
          disabled={chargementSuggestion || etat.imageDocker.trim().length === 0}
          onClick={() => appliquerSuggestionImage()}
        >
          {chargementSuggestion ? "Analyse de l’image…" : "Préremplir depuis l’image"}
        </button>
        <p className="kp-champ__aide">
          Interroge le moteur après tirage éventuel de l’image : entrypoint, commande, répertoire de travail, ports déclarés et variables du manifeste (aucune garantie pour les images complexes : vérifiez les champs après application).
        </p>
        {messageSuggestion === null ? null : (
          <p className="kidopanel-texte-muted" style={{ marginTop: "0.35rem" }}>
            {messageSuggestion}
          </p>
        )}
      </div>

      <div className="kp-champ">
        <label className="kp-champ__label" htmlFor="kp-exp-workdir">
          Répertoire de travail (optionnel)
        </label>
        <input
          id="kp-exp-workdir"
          type="text"
          placeholder="ex. /app"
          value={etat.repertoireTravailDocker}
          onChange={(e) =>
            surChangement({ ...etat, repertoireTravailDocker: e.target.value })
          }
        />
      </div>

      <details className="kp-details-section">
        <summary>Réseau KidoPanel</summary>
        <div className="kp-details-section__corps">
          <div className="kp-champ">
            <label className="kp-champ__label" htmlFor="kp-exp-net">
              Mode réseau Docker
            </label>
            <select
              id="kp-exp-net"
              value={etat.modeReseau}
              onChange={(e) =>
                surChangement({
                  ...etat,
                  modeReseau: e.target.value as EtatFormulaireExpertConteneur["modeReseau"],
                })
              }
            >
              <option value="bridge">bridge (recommandé avec KidoPanel)</option>
              <option value="host">host</option>
              <option value="none">none</option>
            </select>
          </div>
          {etat.modeReseau === "bridge" ? (
            <>
              {erreurPonts === null ? null : (
                <p className="bandeau-erreur-auth" role="alert">
                  {erreurPonts}
                </p>
              )}
              <div className="kp-champ">
                <span className="kp-champ__label">Ponts du panel</span>
                <div
                  className="kp-champ kp-champ--horizontal"
                  style={{ flexWrap: "wrap", gap: "0.75rem" }}
                >
                  <label>
                    <input
                      type="radio"
                      name="kp-exp-strat-kido"
                      checked={etat.strategieReseauKidoPanel === "kidopanel_seul"}
                      onChange={() => {
                        surChangement({
                          ...etat,
                          strategieReseauKidoPanel: "kidopanel_seul",
                          nomDockerPontUtilisateur: "",
                        });
                      }}
                    />{" "}
                    Réseau KidoPanel uniquement
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="kp-exp-strat-kido"
                      checked={etat.strategieReseauKidoPanel === "pont_utilisateur_seul"}
                      onChange={() => {
                        surChangement({
                          ...etat,
                          strategieReseauKidoPanel: "pont_utilisateur_seul",
                        });
                      }}
                    />{" "}
                    Mon pont uniquement
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="kp-exp-strat-kido"
                      checked={etat.strategieReseauKidoPanel === "kidopanel_et_pont"}
                      onChange={() => {
                        surChangement({
                          ...etat,
                          strategieReseauKidoPanel: "kidopanel_et_pont",
                        });
                      }}
                    />{" "}
                    KidoPanel et mon pont
                  </label>
                </div>
              </div>
              {(etat.strategieReseauKidoPanel === "pont_utilisateur_seul" ||
                etat.strategieReseauKidoPanel === "kidopanel_et_pont") && (
                <div className="kp-champ">
                  <label className="kp-champ__label kp-champ__label--requis" htmlFor="kp-exp-pont-liste">
                    Pont utilisateur
                  </label>
                  <select
                    id="kp-exp-pont-liste"
                    value={
                      listePonts.find((p) => p.nomDocker === etat.nomDockerPontUtilisateur)
                        ?.id ?? ""
                    }
                    disabled={chargementPonts || listePonts.length === 0}
                    onChange={(e) => {
                      const id = e.target.value;
                      majPontSelectionne(id);
                    }}
                  >
                    <option value="">
                      {libelleOptionPontFormulaireExpertDefaut(
                        chargementPonts,
                        listePonts.length,
                      )}
                    </option>
                    {listePonts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nomAffichage} ({p.sousReseauCidr})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {etat.strategieReseauKidoPanel === "kidopanel_et_pont" ? (
                <div className="kp-champ kp-champ--horizontal">
                  <label className="kp-champ__label" htmlFor="kp-exp-primaire-kido">
                    Créer d’abord sur le réseau KidoPanel
                  </label>
                  <input
                    id="kp-exp-primaire-kido"
                    type="checkbox"
                    checked={etat.primaireReseauKidopanelEnDouble}
                    onChange={(e) =>
                      surChangement({
                        ...etat,
                        primaireReseauKidopanelEnDouble: e.target.checked,
                      })
                    }
                  />
                </div>
              ) : null}
            </>
          ) : (
            <p className="kp-champ__aide">
              Les options de pont KidoPanel s’appliquent uniquement en mode bridge.
            </p>
          )}
          <div className="kp-champ">
            <label className="kp-champ__label" htmlFor="kp-exp-hostname">
              Nom d&apos;hôte (optionnel)
            </label>
            <input
              id="kp-exp-hostname"
              type="text"
              value={etat.nomHoteReseau}
              onChange={(e) =>
                surChangement({ ...etat, nomHoteReseau: e.target.value })
              }
            />
          </div>
        </div>
      </details>
    </>
  );
}
