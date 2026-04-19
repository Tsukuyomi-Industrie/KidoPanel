import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { creerCallbacksListeEtActionsConteneurs } from "./callbacks-liste-et-actions-conteneurs-passerelle.js";
import { construireCorpsCreationConteneurDepuisEtat } from "../lab/corpsCreationConteneurLab.js";
import {
  etatInitialCreationConteneurLab,
  type EtatCreationConteneurLab,
} from "../lab/etatCreationConteneurLab.js";
import {
  appelerPasserelle,
  composerUrlPasserelle,
  corpsErreurDepuisReponse,
  formaterErreurAffichage,
  lireJetonStockage,
} from "../lab/passerelleClient.js";
import { formaterErreurPourAffichagePanel } from "../lab/passerelleErreursAffichageLab.js";
import { sondageSantePasserelle } from "../lab/passerelleSondeLab.js";
import type { ResumeConteneurLab } from "../lab/typesConteneurLab.js";

type EtatSonde = "en_cours" | "ok" | "echec";

export type GestionConteneursPasserelleContexte = {
  conteneurs: ResumeConteneurLab[];
  idSelectionne: string;
  setIdSelectionne: (id: string) => void;
  etatCreation: EtatCreationConteneurLab;
  majEtatCreation: (partiel: Partial<EtatCreationConteneurLab>) => void;
  remplirFormulaireCreation: (etat: EtatCreationConteneurLab) => void;
  messageErreur: string | null;
  setMessageErreur: (msg: string | null) => void;
  chargementListe: boolean;
  fluxJournauxActif: boolean;
  setFluxJournauxActif: (v: boolean) => void;
  etatSondePasserelle: EtatSonde;
  texteSondePasserelle: string;
  reverifierPasserelle: () => Promise<void>;
  rafraichirListe: () => Promise<void>;
  surCreer: () => Promise<void>;
  /**
   * Envoie un corps `POST /containers` déjà assemblé côté interface (gabarit rapide ou formulaire expert structuré).
   */
  surPosterCreationConteneurJson: (corps: Record<string, unknown>) => Promise<boolean>;
  /**
   * Crée une instance via gabarit passerelle (`templateId` + `configuration`) sans reconstruire le corps depuis le formulaire avancé.
   */
  surCreerDepuisTemplate: (
    templateId: string,
    configuration: Record<string, unknown>,
  ) => Promise<void>;
  actionConteneur: (
    id: string,
    methode: "POST" | "DELETE",
    cheminSuffixe: string,
  ) => Promise<void>;
  jetonSession: string;
  refUrlContexteErreur: MutableRefObject<string>;
};

const Ctx = createContext<GestionConteneursPasserelleContexte | null>(null);

/**
 * Fournit l’état partagé entre la liste des conteneurs, les journaux et l’assistant de création.
 */
export function GestionConteneursPasserelleProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [conteneurs, setConteneurs] = useState<ResumeConteneurLab[]>([]);
  const [idSelectionne, setIdSelectionne] = useState("");
  const [etatCreation, setEtatCreation] = useState<EtatCreationConteneurLab>(
    etatInitialCreationConteneurLab,
  );
  const majEtatCreation = useCallback((partiel: Partial<EtatCreationConteneurLab>) => {
    setEtatCreation((courant) => ({ ...courant, ...partiel }));
  }, []);
  const remplirFormulaireCreation = useCallback((nouvelEtat: EtatCreationConteneurLab) => {
    setEtatCreation(nouvelEtat);
  }, []);
  const [messageErreur, setMessageErreur] = useState<string | null>(null);
  const [chargementListe, setChargementListe] = useState(false);
  const [fluxJournauxActif, setFluxJournauxActif] = useState(false);
  const [etatSondePasserelle, setEtatSondePasserelle] = useState<EtatSonde>("en_cours");
  const [texteSondePasserelle, setTexteSondePasserelle] = useState("");
  const refUrlContexteErreur = useRef<string>(composerUrlPasserelle("/containers"));

  useEffect(() => {
    let annule = false;
    (async () => {
      setEtatSondePasserelle("en_cours");
      const resultat = await sondageSantePasserelle();
      if (annule) {
        return;
      }
      setEtatSondePasserelle(resultat.joignable ? "ok" : "echec");
      setTexteSondePasserelle(resultat.message);
    })().catch(() => {});
    return () => {
      annule = true;
    };
  }, []);

  const reverifierPasserelle = useCallback(async () => {
    setEtatSondePasserelle("en_cours");
    const resultat = await sondageSantePasserelle();
    setEtatSondePasserelle(resultat.joignable ? "ok" : "echec");
    setTexteSondePasserelle(resultat.message);
  }, []);

  const afficherErreurSiBesoin = useCallback(async (reponse: Response) => {
    if (reponse.ok) {
      setMessageErreur(null);
      return true;
    }
    const corps = await corpsErreurDepuisReponse(reponse);
    setMessageErreur(formaterErreurAffichage(corps));
    return false;
  }, []);

  const { rafraichirListe, actionConteneur } = useMemo(
    () =>
      creerCallbacksListeEtActionsConteneurs({
        refUrlContexteErreur,
        afficherErreurSiBesoin,
        setConteneurs,
        setMessageErreur,
        setChargementListe,
      }),
    [afficherErreurSiBesoin],
  );

  useEffect(() => {
    rafraichirListe();
  }, [rafraichirListe]);

  const surCreer = useCallback(async () => {
    setMessageErreur(null);
    let corps: Record<string, unknown>;
    try {
      corps = construireCorpsCreationConteneurDepuisEtat(etatCreation);
    } catch (error_) {
      setMessageErreur(
        formaterErreurPourAffichagePanel(
          error_,
          composerUrlPasserelle("/containers"),
          "préparation du corps de création",
        ),
      );
      return;
    }
    try {
      refUrlContexteErreur.current = composerUrlPasserelle("/containers");
      const reponse = await appelerPasserelle("/containers", {
        method: "POST",
        body: JSON.stringify(corps),
      });
      if (!(await afficherErreurSiBesoin(reponse))) {
        return;
      }
      await rafraichirListe();
    } catch (error_) {
      setMessageErreur(
        formaterErreurPourAffichagePanel(
          error_,
          composerUrlPasserelle("/containers"),
          "création d’instance",
        ),
      );
    }
  }, [afficherErreurSiBesoin, etatCreation, rafraichirListe]);

  const surPosterCreationConteneurJson = useCallback(
    async (corps: Record<string, unknown>): Promise<boolean> => {
      setMessageErreur(null);
      try {
        refUrlContexteErreur.current = composerUrlPasserelle("/containers");
        const reponse = await appelerPasserelle("/containers", {
          method: "POST",
          body: JSON.stringify(corps),
        });
        if (!(await afficherErreurSiBesoin(reponse))) {
          return false;
        }
        await rafraichirListe();
        return true;
      } catch (error_) {
        setMessageErreur(
          formaterErreurPourAffichagePanel(
            error_,
            composerUrlPasserelle("/containers"),
            "création de conteneur",
          ),
        );
        return false;
      }
    },
    [afficherErreurSiBesoin, rafraichirListe],
  );

  const surCreerDepuisTemplate = useCallback(
    async (templateId: string, configuration: Record<string, unknown>) => {
      setMessageErreur(null);
      try {
        refUrlContexteErreur.current = composerUrlPasserelle("/containers");
        const reponse = await appelerPasserelle("/containers", {
          method: "POST",
          body: JSON.stringify({ templateId, configuration }),
        });
        if (!(await afficherErreurSiBesoin(reponse))) {
          return;
        }
        await rafraichirListe();
      } catch (error_) {
        setMessageErreur(
          formaterErreurPourAffichagePanel(
            error_,
            composerUrlPasserelle("/containers"),
            "création d’instance depuis gabarit",
          ),
        );
      }
    },
    [afficherErreurSiBesoin, rafraichirListe],
  );

  const valeur = useMemo<GestionConteneursPasserelleContexte>(() => {
    const jetonSession = lireJetonStockage();
    return {
      conteneurs,
      idSelectionne,
      setIdSelectionne,
      etatCreation,
      majEtatCreation,
      remplirFormulaireCreation,
      messageErreur,
      setMessageErreur,
      chargementListe,
      fluxJournauxActif,
      setFluxJournauxActif,
      etatSondePasserelle,
      texteSondePasserelle,
      reverifierPasserelle,
      rafraichirListe,
      surCreer,
      surPosterCreationConteneurJson,
      surCreerDepuisTemplate,
      actionConteneur,
      jetonSession,
      refUrlContexteErreur,
    };
  }, [
    conteneurs,
    idSelectionne,
    etatCreation,
    messageErreur,
    chargementListe,
    fluxJournauxActif,
    etatSondePasserelle,
    texteSondePasserelle,
    reverifierPasserelle,
    rafraichirListe,
    surCreer,
    surPosterCreationConteneurJson,
    surCreerDepuisTemplate,
    actionConteneur,
  ]);

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

/** Accède au contexte partagé du cœur Docker (liste, création, journaux). */
export function useGestionConteneursPasserelle(): GestionConteneursPasserelleContexte {
  const v = useContext(Ctx);
  if (v === null) {
    throw new Error(
      "useGestionConteneursPasserelle doit être utilisé sous GestionConteneursPasserelleProvider.",
    );
  }
  return v;
}
