import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  actionConteneur: (
    id: string,
    methode: "POST" | "DELETE",
    cheminSuffixe: string,
  ) => Promise<void>;
  jetonSession: string;
  refUrlContexteErreur: React.MutableRefObject<string>;
};

const Ctx = createContext<GestionConteneursPasserelleContexte | null>(null);

/**
 * Fournit l’état partagé entre la liste des conteneurs, les journaux et l’assistant de création.
 */
export function GestionConteneursPasserelleProvider({
  children,
}: {
  children: ReactNode;
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
    void (async () => {
      setEtatSondePasserelle("en_cours");
      const resultat = await sondageSantePasserelle();
      if (annule) {
        return;
      }
      setEtatSondePasserelle(resultat.joignable ? "ok" : "echec");
      setTexteSondePasserelle(resultat.message);
    })();
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

  const rafraichirListe = useCallback(async () => {
    setChargementListe(true);
    setMessageErreur(null);
    try {
      refUrlContexteErreur.current = composerUrlPasserelle("/containers");
      const reponse = await appelerPasserelle("/containers", { method: "GET" });
      if (!(await afficherErreurSiBesoin(reponse))) {
        return;
      }
      const donnees = (await reponse.json()) as {
        containers?: ResumeConteneurLab[];
      };
      setConteneurs(Array.isArray(donnees.containers) ? donnees.containers : []);
    } catch (e) {
      setMessageErreur(
        formaterErreurPourAffichagePanel(
          e,
          composerUrlPasserelle("/containers"),
          "liste des conteneurs",
        ),
      );
    } finally {
      setChargementListe(false);
    }
  }, [afficherErreurSiBesoin]);

  useEffect(() => {
    void rafraichirListe();
  }, [rafraichirListe]);

  const surCreer = useCallback(async () => {
    setMessageErreur(null);
    let corps: Record<string, unknown>;
    try {
      corps = construireCorpsCreationConteneurDepuisEtat(etatCreation);
    } catch (e) {
      setMessageErreur(
        formaterErreurPourAffichagePanel(
          e,
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
    } catch (e) {
      setMessageErreur(
        formaterErreurPourAffichagePanel(
          e,
          composerUrlPasserelle("/containers"),
          "création de conteneur",
        ),
      );
    }
  }, [afficherErreurSiBesoin, etatCreation, rafraichirListe]);

  const actionConteneur = useCallback(
    async (id: string, methode: "POST" | "DELETE", cheminSuffixe: string) => {
      setMessageErreur(null);
      try {
        refUrlContexteErreur.current = composerUrlPasserelle(
          `/containers/${encodeURIComponent(id)}${cheminSuffixe}`,
        );
        const reponse = await appelerPasserelle(
          `/containers/${encodeURIComponent(id)}${cheminSuffixe}`,
          { method: methode },
        );
        if (!(await afficherErreurSiBesoin(reponse))) {
          return;
        }
        await rafraichirListe();
      } catch (e) {
        setMessageErreur(
          formaterErreurPourAffichagePanel(
            e,
            composerUrlPasserelle(
              `/containers/${encodeURIComponent(id)}${cheminSuffixe}`,
            ),
            "action sur un conteneur",
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
