import { useCallback, useEffect, useState } from "react";
import { construireCorpsCreationConteneurDepuisEtat } from "./corpsCreationConteneurLab.js";
import { etatDepuisCorpsCreationConteneurLab } from "./etat-depuis-corps-creation-conteneur-lab.js";
import type { EtatCreationConteneurLab } from "./etatCreationConteneurLab.js";
import {
  ecrireConfigurationsCreationConteneurLab,
  genererIdConfigurationCreationConteneurLab,
  lireConfigurationsCreationConteneurLab,
  stockageLocalDisponible,
} from "./stockageConfigurationsCreationConteneurLab.js";
import { styleBlocLab } from "./stylesCommunsLab.js";
import {
  styleChampTexteCreation,
  styleLabelChampCreation,
  styleTitreChampCreation,
} from "./stylesFormulaireCreationConteneurLab.js";
import type { ConfigurationCreationConteneurSauvegardee } from "./typesConfigurationCreationConteneurLab.js";

type Props = {
  etatFormulaire: EtatCreationConteneurLab;
  surRemplirFormulaire: (nouvelEtat: EtatCreationConteneurLab) => void;
  surErreur: (message: string) => void;
};

type ModeModal = "ferme" | "creation" | "edition";

/**
 * Liste déroulante des configurations persistées, modal de création ou d’édition JSON,
 * application au formulaire et suppression.
 */
export function PanneauConfigurationsSauvegardeesCreationConteneurLab({
  etatFormulaire,
  surRemplirFormulaire,
  surErreur,
}: Props) {
  const [liste, setListe] = useState<ConfigurationCreationConteneurSauvegardee[]>([]);
  const [idSelection, setIdSelection] = useState("");
  const [modal, setModal] = useState<ModeModal>("ferme");
  const [nomEdition, setNomEdition] = useState("");
  const [jsonEdition, setJsonEdition] = useState("");
  const [idEditee, setIdEditee] = useState<string | null>(null);

  const recharger = useCallback(() => {
    setListe(lireConfigurationsCreationConteneurLab());
  }, []);

  useEffect(() => {
    recharger();
  }, [recharger]);

  const ouvrirCreation = useCallback(() => {
    try {
      const corps = construireCorpsCreationConteneurDepuisEtat(etatFormulaire);
      setNomEdition("");
      setJsonEdition(JSON.stringify(corps, null, 2));
      setIdEditee(null);
      setModal("creation");
    } catch (e) {
      surErreur(
        e instanceof Error
          ? e.message
          : "Impossible de préremplir le JSON à partir du formulaire actuel.",
      );
    }
  }, [etatFormulaire, surErreur]);

  const ouvrirEdition = useCallback(() => {
    const trouvee = liste.find((x) => x.id === idSelection);
    if (!trouvee) {
      surErreur("Sélectionnez une configuration à modifier.");
      return;
    }
    setNomEdition(trouvee.nom);
    setJsonEdition(JSON.stringify(trouvee.corps, null, 2));
    setIdEditee(trouvee.id);
    setModal("edition");
  }, [idSelection, liste, surErreur]);

  const fermerModal = useCallback(() => {
    setModal("ferme");
    setNomEdition("");
    setJsonEdition("");
    setIdEditee(null);
  }, []);

  const persisterListe = useCallback(
    (nouvelle: ConfigurationCreationConteneurSauvegardee[]) => {
      try {
        ecrireConfigurationsCreationConteneurLab(nouvelle);
        setListe(nouvelle);
      } catch (e) {
        surErreur(
          e instanceof Error
            ? e.message
            : "Échec de l’écriture dans le stockage local du navigateur.",
        );
      }
    },
    [surErreur],
  );

  const sauvegarderModal = useCallback(() => {
    const nom = nomEdition.trim();
    if (nom.length === 0) {
      surErreur("Le nom de la configuration est obligatoire.");
      return;
    }
    let corps: Record<string, unknown>;
    try {
      corps = JSON.parse(jsonEdition) as unknown as Record<string, unknown>;
    } catch {
      surErreur("Le JSON du corps de configuration est invalide (parse JSON).");
      return;
    }
    if (corps === null || typeof corps !== "object" || Array.isArray(corps)) {
      surErreur("Le corps JSON doit être un objet (pas un tableau ni une valeur simple).");
      return;
    }
    if (typeof corps.image !== "string" || corps.image.trim().length === 0) {
      surErreur(
        "Le corps JSON doit contenir une clé « image » (chaîne non vide).",
      );
      return;
    }
    if (modal === "creation") {
      const entree: ConfigurationCreationConteneurSauvegardee = {
        id: genererIdConfigurationCreationConteneurLab(),
        nom,
        corps,
      };
      persisterListe([...liste, entree]);
      setIdSelection(entree.id);
    } else if (modal === "edition" && idEditee !== null) {
      const suivante = liste.map((x) =>
        x.id === idEditee ? { ...x, nom, corps } : x,
      );
      persisterListe(suivante);
    }
    fermerModal();
  }, [
    fermerModal,
    idEditee,
    jsonEdition,
    liste,
    modal,
    nomEdition,
    persisterListe,
    surErreur,
  ]);

  const appliquerSelection = useCallback(() => {
    const trouvee = liste.find((x) => x.id === idSelection);
    if (!trouvee) {
      surErreur("Sélectionnez une configuration à appliquer au formulaire.");
      return;
    }
    try {
      const nouvelEtat = etatDepuisCorpsCreationConteneurLab(trouvee.corps);
      surRemplirFormulaire(nouvelEtat);
    } catch (e) {
      surErreur(
        e instanceof Error
          ? e.message
          : "Impossible d’appliquer cette configuration au formulaire.",
      );
    }
  }, [idSelection, liste, surErreur, surRemplirFormulaire]);

  const supprimerSelection = useCallback(() => {
    const trouvee = liste.find((x) => x.id === idSelection);
    if (!trouvee) {
      surErreur("Sélectionnez une configuration à supprimer.");
      return;
    }
    if (!globalThis.confirm(`Supprimer la configuration « ${trouvee.nom} » ?`)) {
      return;
    }
    const suivante = liste.filter((x) => x.id !== idSelection);
    persisterListe(suivante);
    setIdSelection("");
  }, [idSelection, liste, persisterListe, surErreur]);

  const stockageOk = stockageLocalDisponible();

  return (
    <section style={{ ...styleBlocLab, marginBottom: 12 }}>
      <h2 style={{ fontSize: "1rem", marginTop: 0 }}>
        Configurations sauvegardées (navigateur)
      </h2>
      <p style={{ fontSize: "0.82rem", opacity: 0.88, marginTop: 0 }}>
        Chaque configuration est un corps JSON complet pour <code>POST /containers</code>, stocké
        uniquement dans ce navigateur (localStorage). Sélectionnez une entrée puis appliquez-la au
        formulaire avant de créer le conteneur, ou modifiez-la au format JSON.
      </p>
      {!stockageOk ? (
        <p style={{ fontSize: "0.88rem", color: "#c66" }}>
          Le stockage local n’est pas disponible : impossible d’enregistrer des configurations dans
          cet environnement.
        </p>
      ) : null}

      <label style={styleLabelChampCreation}>
        <span style={styleTitreChampCreation}>Configuration enregistrée</span>
        <select
          value={idSelection}
          onChange={(e) => setIdSelection(e.target.value)}
          style={styleChampTexteCreation}
          disabled={!stockageOk}
        >
          <option value="">— Aucune sélection —</option>
          {liste.map((cfg) => (
            <option key={cfg.id} value={cfg.id}>
              {cfg.nom}
            </option>
          ))}
        </select>
      </label>
      {stockageOk && liste.length === 0 ? (
        <p style={{ fontSize: "0.88rem", opacity: 0.85, marginTop: 6 }}>
          Aucune configuration enregistrée pour le moment.
        </p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        <button type="button" disabled={!stockageOk} onClick={() => void ouvrirCreation()}>
          Créer une configuration
        </button>
        <button
          type="button"
          disabled={!stockageOk || idSelection.length === 0}
          onClick={() => void ouvrirEdition()}
        >
          Modifier la configuration sélectionnée
        </button>
        <button
          type="button"
          disabled={!stockageOk || idSelection.length === 0}
          onClick={() => void appliquerSelection()}
        >
          Appliquer au formulaire
        </button>
        <button
          type="button"
          disabled={!stockageOk || idSelection.length === 0}
          onClick={() => void supprimerSelection()}
        >
          Supprimer la sélection
        </button>
      </div>

      {modal !== "ferme" ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          role="presentation"
          onClick={fermerModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              background: "#1a1a1a",
              color: "#eee",
              maxWidth: 720,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              padding: 16,
              borderRadius: 8,
              border: "1px solid #444",
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, fontSize: "1rem" }}>
              {modal === "creation"
                ? "Nouvelle configuration"
                : "Modifier la configuration"}
            </h3>
            <label style={styleLabelChampCreation}>
              <span style={styleTitreChampCreation}>Nom affiché dans la liste</span>
              <input
                value={nomEdition}
                onChange={(e) => setNomEdition(e.target.value)}
                style={styleChampTexteCreation}
              />
            </label>
            <label style={styleLabelChampCreation}>
              <span style={styleTitreChampCreation}>Corps JSON (POST /containers)</span>
              <textarea
                value={jsonEdition}
                onChange={(e) => setJsonEdition(e.target.value)}
                rows={18}
                style={{ ...styleChampTexteCreation, minHeight: "14rem" }}
              />
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="button" onClick={() => void sauvegarderModal()}>
                Enregistrer
              </button>
              <button type="button" onClick={fermerModal}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
