import { useCallback, useEffect, useRef, useState } from "react";
import { SectionAuthLab } from "./SectionAuthLab.js";
import { construireCorpsCreationConteneurDepuisEtat } from "./corpsCreationConteneurLab.js";
import {
  etatInitialCreationConteneurLab,
  type EtatCreationConteneurLab,
} from "./etatCreationConteneurLab.js";
import { SectionCreationConteneurAvanceLab } from "./SectionCreationConteneurAvanceLab.js";
import { SectionListeConteneursLab } from "./SectionConteneursEtCreationLab.js";
import { SectionJournauxSseLab } from "./SectionJournauxSseLab.js";
import {
  appelerPasserelle,
  composerUrlPasserelle,
  corpsErreurDepuisReponse,
  enregistrerJetonStockage,
  formaterErreurAffichage,
  lireJetonStockage,
  urlBasePasserelle,
} from "./passerelleClient.js";
import { formaterErreurPourAffichagePanel } from "./passerelleErreursAffichageLab.js";
import { PanneauSanteEtErreurPasserelleLab } from "./PanneauSanteEtErreurPasserelleLab.js";
import { sondageSantePasserelle } from "./passerelleSondeLab.js";
import type { ResumeConteneurLab } from "./typesConteneurLab.js";

/**
 * Outil de débogage tout-en-un (auth + liste + création + SSE) : conservé pour essais hors routeur
 * principal ; l’application KidoPanel utilise désormais les pages « Cœur Docker » et création dédiées.
 */
export function InterfaceTestPasserelle() {
  const [jeton, setJeton] = useState(lireJetonStockage);
  const [emailInscription, setEmailInscription] = useState("");
  const [motDePasseInscription, setMotDePasseInscription] = useState("");
  const [emailConnexion, setEmailConnexion] = useState("");
  const [motDePasseConnexion, setMotDePasseConnexion] = useState("");
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
  const [etatSondePasserelle, setEtatSondePasserelle] = useState<
    "en_cours" | "ok" | "echec"
  >("en_cours");
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

  const reverifierPasserelle = async () => {
    setEtatSondePasserelle("en_cours");
    const resultat = await sondageSantePasserelle();
    setEtatSondePasserelle(resultat.joignable ? "ok" : "echec");
    setTexteSondePasserelle(resultat.message);
  };

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

  const surInscription = async () => {
    setMessageErreur(null);
    try {
      refUrlContexteErreur.current = composerUrlPasserelle("/auth/register");
      const reponse = await appelerPasserelle("/auth/register", {
        method: "POST",
        jetonBearer: "",
        body: JSON.stringify({
          email: emailInscription,
          password: motDePasseInscription,
        }),
      });
      if (!(await afficherErreurSiBesoin(reponse))) {
        return;
      }
      const donnees = (await reponse.json()) as { token?: string };
      if (typeof donnees.token === "string") {
        setJeton(donnees.token);
        enregistrerJetonStockage(donnees.token);
      }
    } catch (e) {
      setMessageErreur(
        formaterErreurPourAffichagePanel(
          e,
          composerUrlPasserelle("/auth/register"),
          "inscription",
        ),
      );
    }
  };

  const surConnexion = async () => {
    setMessageErreur(null);
    try {
      refUrlContexteErreur.current = composerUrlPasserelle("/auth/login");
      const reponse = await appelerPasserelle("/auth/login", {
        method: "POST",
        jetonBearer: "",
        body: JSON.stringify({
          email: emailConnexion,
          password: motDePasseConnexion,
        }),
      });
      if (!(await afficherErreurSiBesoin(reponse))) {
        return;
      }
      const donnees = (await reponse.json()) as { token?: string };
      if (typeof donnees.token === "string") {
        setJeton(donnees.token);
        enregistrerJetonStockage(donnees.token);
      }
    } catch (e) {
      setMessageErreur(
        formaterErreurPourAffichagePanel(
          e,
          composerUrlPasserelle("/auth/login"),
          "connexion",
        ),
      );
    }
  };

  const surCreer = async () => {
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
  };

  const actionConteneur = async (
    id: string,
    methode: "POST" | "DELETE",
    cheminSuffixe: string,
  ) => {
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
  };

  return (
    <main style={{ padding: "1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.25rem" }}>KidoPanel — test passerelle</h1>
      <p style={{ fontSize: "0.9rem", opacity: 0.85 }}>
        Passerelle : <code>{urlBasePasserelle()}</code> — en <code>pnpm dev</code>, hôte distant (IP / domaine)
        : proxy Vite par défaut (pas d’exposition du 3000). Preview / prod ou{" "}
        <code>VITE_GATEWAY_DEV_USE_PROXY=0</code> : <code>http(s)://</code> même hôte, port 3000. Voir{" "}
        <code>apps/web/.env.example</code>.
      </p>

      <PanneauSanteEtErreurPasserelleLab
        etatSondePasserelle={etatSondePasserelle}
        texteSondePasserelle={texteSondePasserelle}
        surReverifierPasserelle={reverifierPasserelle}
        messageErreur={messageErreur}
        refUrlContexteErreur={refUrlContexteErreur}
      />

      <SectionAuthLab
        emailInscription={emailInscription}
        setEmailInscription={setEmailInscription}
        motDePasseInscription={motDePasseInscription}
        setMotDePasseInscription={setMotDePasseInscription}
        emailConnexion={emailConnexion}
        setEmailConnexion={setEmailConnexion}
        motDePasseConnexion={motDePasseConnexion}
        setMotDePasseConnexion={setMotDePasseConnexion}
        jeton={jeton}
        setJeton={setJeton}
        surInscription={surInscription}
        surConnexion={surConnexion}
      />

      <SectionListeConteneursLab
        conteneurs={conteneurs}
        idSelectionne={idSelectionne}
        setIdSelectionne={setIdSelectionne}
        rafraichirListe={rafraichirListe}
        chargementListe={chargementListe}
        actionConteneur={actionConteneur}
      />

      <SectionCreationConteneurAvanceLab
        etat={etatCreation}
        majEtat={majEtatCreation}
        surCreer={surCreer}
        surRemplirFormulaire={remplirFormulaireCreation}
        surErreurConfiguration={(msg) => setMessageErreur(msg)}
        jetonSession={jeton}
      />

      <SectionJournauxSseLab
        idSelectionne={idSelectionne}
        jeton={jeton}
        fluxJournauxActif={fluxJournauxActif}
        setFluxJournauxActif={setFluxJournauxActif}
      />
    </main>
  );
}
