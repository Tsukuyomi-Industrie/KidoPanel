import { useCallback, useEffect, useRef, useState } from "react";
import { SectionAuthLab } from "./SectionAuthLab.js";
import {
  SectionCreationConteneurLab,
  SectionListeConteneursLab,
} from "./SectionConteneursEtCreationLab.js";
import { SectionJournauxSseLab } from "./SectionJournauxSseLab.js";
import {
  appelerPasserelle,
  composerUrlPasserelle,
  corpsErreurDepuisReponse,
  enrichirTexteErreurPourAffichage,
  enregistrerJetonStockage,
  formaterErreurAffichage,
  formaterErreurPourAffichagePanel,
  lireJetonStockage,
  sondageSantePasserelle,
  urlBasePasserelle,
} from "./passerelleClient.js";
import { styleBlocLab, stylePreLab } from "./stylesCommunsLab.js";
import type { ResumeConteneurLab } from "./typesConteneurLab.js";

/**
 * Interface minimale pour enregistrer un compte, se connecter, piloter les conteneurs
 * et afficher le flux SSE des journaux via la passerelle.
 */
export function InterfaceTestPasserelle() {
  const [jeton, setJeton] = useState(lireJetonStockage);
  const [emailInscription, setEmailInscription] = useState("");
  const [motDePasseInscription, setMotDePasseInscription] = useState("");
  const [emailConnexion, setEmailConnexion] = useState("");
  const [motDePasseConnexion, setMotDePasseConnexion] = useState("");
  const [conteneurs, setConteneurs] = useState<ResumeConteneurLab[]>([]);
  const [idSelectionne, setIdSelectionne] = useState("");
  const [imageCreation, setImageCreation] = useState("nginx:alpine");
  const [nomCreation, setNomCreation] = useState("");
  const [messageErreur, setMessageErreur] = useState<string | null>(null);
  const [chargementListe, setChargementListe] = useState(false);
  const [fluxJournauxActif, setFluxJournauxActif] = useState(false);
  const [etatSondePasserelle, setEtatSondePasserelle] = useState<
    "en_cours" | "ok" | "echec"
  >("en_cours");
  const [texteSondePasserelle, setTexteSondePasserelle] = useState("");
  const refUrlContexteErreur = useRef<string>(composerUrlPasserelle("/containers"));

  useEffect(() => {
    enregistrerJetonStockage(jeton);
  }, [jeton]);

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
    const corps: { image: string; name?: string } = {
      image: imageCreation.trim(),
    };
    const nom = nomCreation.trim();
    if (nom !== "") {
      corps.name = nom;
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
        Passerelle : <code>{urlBasePasserelle()}</code> (variable{" "}
        <code>VITE_GATEWAY_BASE_URL</code>)
      </p>

      <div
        style={{
          ...styleBlocLab,
          marginBottom: "0.75rem",
          borderColor:
            etatSondePasserelle === "ok"
              ? "#2a5a2a"
              : etatSondePasserelle === "echec"
                ? "#a33"
                : "#555",
        }}
      >
        <strong>Sonde GET /health</strong>
        {etatSondePasserelle === "en_cours" ? (
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.9rem" }}>
            Vérification en cours…
          </p>
        ) : (
          <pre style={{ ...stylePreLab, marginTop: "0.35rem" }}>
            {enrichirTexteErreurPourAffichage(
              texteSondePasserelle,
              composerUrlPasserelle("/health"),
            )}
          </pre>
        )}
        <button
          type="button"
          onClick={() => void reverifierPasserelle()}
          disabled={etatSondePasserelle === "en_cours"}
          style={{ marginTop: "0.5rem" }}
        >
          Revérifier la connexion
        </button>
      </div>

      {messageErreur ? (
        <div
          role="alert"
          style={{
            ...styleBlocLab,
            borderColor: "#a33",
            background: "#2a1515",
          }}
        >
          <strong>Erreur</strong>
          <pre
            style={{
              ...stylePreLab,
              maxHeight: "min(70vh, 560px)",
              minHeight: "4.5rem",
            }}
          >
            {enrichirTexteErreurPourAffichage(
              messageErreur,
              refUrlContexteErreur.current,
            )}
          </pre>
        </div>
      ) : null}

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

      <SectionCreationConteneurLab
        imageCreation={imageCreation}
        setImageCreation={setImageCreation}
        nomCreation={nomCreation}
        setNomCreation={setNomCreation}
        surCreer={surCreer}
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
