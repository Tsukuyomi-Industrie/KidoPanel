import { useEffect, useState } from "react";
import type { ImageCatalogueApi } from "@kidopanel/container-catalog";
import { SegmentRepliableCreationKidoPanel } from "../interface/SegmentRepliableCreationKidoPanel.js";
import type { EtatCreationConteneurLab } from "./etatCreationConteneurLab.js";
import {
  AIDE_ADRESSE_MAC,
  AIDE_CMD,
  AIDE_DOMAINNAME,
  AIDE_ENTRYPOINT,
  AIDE_HOSTNAME_CONTENEUR,
  AIDE_NOM_CONTENEUR,
  AIDE_REPERTOIRE_TRAVAIL,
  AIDE_SIGNAL_ARRET,
  AIDE_UTILISATEUR_PROCESSUS,
} from "./definitionsAidesCreationConteneurLab.js";
import { SousBlocChoixImageDockerCreationConteneurLab } from "./SousBlocChoixImageDockerCreationConteneurLab.js";
import { appelerPasserelle } from "./passerelleClient.js";
import {
  styleChampTexteCreation,
  styleLabelChampCreation,
  styleTitreChampCreation,
} from "./stylesFormulaireCreationConteneurLab.js";
import { TexteAideChampCreationConteneurLab } from "./TexteAideChampCreationConteneurLab.js";

type Props = {
  readonly etat: EtatCreationConteneurLab;
  readonly majEtat: (partiel: Partial<EtatCreationConteneurLab>) => void;
  /** Jeton JWT courant : sans jeton, le catalogue `GET /images` n’est pas chargé. */
  readonly jetonSession: string;
};

/** Identité catalogue, nom du conteneur, commande, entrypoint et identité processus. */
export function BlocIdentiteEtCommandeCreationConteneurLab({
  etat,
  majEtat,
  jetonSession,
}: Props) {
  const [imagesCatalogue, setImagesCatalogue] = useState<ImageCatalogueApi[]>(
    [],
  );
  const [chargementCatalogue, setChargementCatalogue] = useState(false);
  const [erreurCatalogue, setErreurCatalogue] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    if (jetonSession.trim() === "") {
      setImagesCatalogue([]);
      setErreurCatalogue(null);
      setChargementCatalogue(false);
      return () => {
        annule = true;
      };
    }
    setChargementCatalogue(true);
    setErreurCatalogue(null);
    (async () => {
      const reponse = await appelerPasserelle("/images", {
        method: "GET",
        jetonBearer: jetonSession,
      });
      if (annule) {
        return;
      }
      if (!reponse.ok) {
        setImagesCatalogue([]);
        setErreurCatalogue(
          `Impossible de charger le catalogue d’images (HTTP ${reponse.status}).`,
        );
        setChargementCatalogue(false);
        return;
      }
      try {
        const donnees = (await reponse.json()) as { images?: ImageCatalogueApi[] };
        const liste = Array.isArray(donnees.images) ? donnees.images : [];
        setImagesCatalogue(liste);
        setErreurCatalogue(null);
      } catch {
        setImagesCatalogue([]);
        setErreurCatalogue("Réponse catalogue d’images invalide (JSON).");
      } finally {
        if (!annule) {
          setChargementCatalogue(false);
        }
      }
    })().catch(() => {});
    return () => {
      annule = true;
    };
  }, [jetonSession]);

  return (
    <>
      <div className="kp-creation-sous-carte">
        <h2>Image Docker et nom sur l’hôte</h2>
        <SousBlocChoixImageDockerCreationConteneurLab
          etat={etat}
          majEtat={majEtat}
          jetonSession={jetonSession}
          imagesCatalogue={imagesCatalogue}
          chargementCatalogue={chargementCatalogue}
          erreurCatalogue={erreurCatalogue}
        />
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Nom du conteneur sur l’hôte</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_NOM_CONTENEUR} />
          <input
            value={etat.nom}
            onChange={(e) => majEtat({ nom: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
      </div>

      <SegmentRepliableCreationKidoPanel
        titre="Commande, point d’entrée et identité du processus"
        sousTitre="Cmd, Entrypoint, WorkingDir, User, Hostname, Domainname, MAC, StopSignal"
        variante="accent"
      >
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Arguments de commande (Cmd)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_CMD} />
          <textarea
            value={etat.cmdLignes}
            onChange={(e) => majEtat({ cmdLignes: e.target.value })}
            rows={4}
            style={{ ...styleChampTexteCreation, minHeight: "4.5rem" }}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Point d’entrée (Entrypoint)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_ENTRYPOINT} />
          <textarea
            value={etat.entrypointLignes}
            onChange={(e) => majEtat({ entrypointLignes: e.target.value })}
            rows={3}
            style={{ ...styleChampTexteCreation, minHeight: "3.2rem" }}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Répertoire de travail (WorkingDir)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_REPERTOIRE_TRAVAIL} />
          <input
            value={etat.repertoireTravail}
            onChange={(e) => majEtat({ repertoireTravail: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Utilisateur du processus principal (User)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_UTILISATEUR_PROCESSUS} />
          <input
            value={etat.utilisateur}
            onChange={(e) => majEtat({ utilisateur: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Nom d’hôte interne au conteneur (Hostname)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_HOSTNAME_CONTENEUR} />
          <input
            value={etat.nomHote}
            onChange={(e) => majEtat({ nomHote: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Domaine DNS du conteneur (Domainname)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_DOMAINNAME} />
          <input
            value={etat.domaineConteneur}
            onChange={(e) => majEtat({ domaineConteneur: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Adresse MAC de l’interface réseau (MacAddress)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_ADRESSE_MAC} />
          <input
            value={etat.adresseMac}
            onChange={(e) => majEtat({ adresseMac: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
        <label style={styleLabelChampCreation}>
          <span style={styleTitreChampCreation}>Signal d’arrêt propre (StopSignal)</span>
          <TexteAideChampCreationConteneurLab texte={AIDE_SIGNAL_ARRET} />
          <input
            value={etat.signalArret}
            onChange={(e) => majEtat({ signalArret: e.target.value })}
            style={styleChampTexteCreation}
          />
        </label>
      </SegmentRepliableCreationKidoPanel>
    </>
  );
}
