import { BlocIdentiteEtCommandeCreationConteneurLab } from "./BlocIdentiteEtCommandeCreationConteneurLab.js";
import { BlocHoteRuntimeEtMemoireCreationConteneurLab } from "./BlocHoteRuntimeEtMemoireCreationConteneurLab.js";
import { BlocJsonCorpsSupplementaireCreationConteneurLab } from "./BlocJsonCorpsSupplementaireCreationConteneurLab.js";
import { BlocOptionsMoteurDockerCreationConteneurLab } from "./BlocOptionsMoteurDockerCreationConteneurLab.js";
import { BlocReseauEtEnvironnementCreationConteneurLab } from "./BlocReseauEtEnvironnementCreationConteneurLab.js";
import { BlocSecuriteRessourcesEtJsonCreationConteneurLab } from "./BlocSecuriteRessourcesEtJsonCreationConteneurLab.js";
import { AIDE_CREATION_CONTENEUR_ENTETE } from "./definitionsAidesCreationConteneurLab.js";
import type { EtatCreationConteneurLab } from "./etatCreationConteneurLab.js";
import { PanneauConfigurationsSauvegardeesCreationConteneurLab } from "./PanneauConfigurationsSauvegardeesCreationConteneurLab.js";
import { styleBlocLab } from "./stylesCommunsLab.js";
import { TexteAideChampCreationConteneurLab } from "./TexteAideChampCreationConteneurLab.js";

type Props = {
  etat: EtatCreationConteneurLab;
  majEtat: (partiel: Partial<EtatCreationConteneurLab>) => void;
  surCreer: () => void;
  surRemplirFormulaire: (nouvelEtat: EtatCreationConteneurLab) => void;
  surErreurConfiguration: (message: string) => void;
  /** Jeton JWT pour charger le catalogue `GET /images` côté formulaire. */
  jetonSession: string;
  /**
   * Masque le paragraphe technique long : utile sur la page « nouveau conteneur » du panel,
   * où l’en-tête de page porte déjà le contexte.
   */
  masquerParagrapheDocumentationApi?: boolean;
};

/** Formulaire avancé de création (image catalogue, commande, réseau, ressources, JSON santé / réseau / host). */
export function SectionCreationConteneurAvanceLab({
  etat,
  majEtat,
  surCreer,
  surRemplirFormulaire,
  surErreurConfiguration,
  jetonSession,
  masquerParagrapheDocumentationApi = false,
}: Props) {
  return (
    <section
      className={
        masquerParagrapheDocumentationApi
          ? "section-creation-conteneur-panel"
          : undefined
      }
      style={styleBlocLab}
    >
      <h2 style={{ fontSize: "1rem", marginTop: 0 }}>
        Créer un conteneur (aide par champ)
      </h2>
      <details open style={{ marginBottom: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>
          Lire avant de remplir : création, démarrage, conteneur qui s’arrête tout de suite
        </summary>
        <TexteAideChampCreationConteneurLab texte={AIDE_CREATION_CONTENEUR_ENTETE} />
      </details>
      {masquerParagrapheDocumentationApi ? null : (
        <p style={{ fontSize: "0.88rem", opacity: 0.88, marginTop: 0 }}>
          Chaque champ ci-dessous comporte un titre lisible et un court texte d’explication. Les noms entre
          parenthèses renvoient aux champs de l’API Docker lorsqu’ils aident à croiser la documentation
          officielle ou Portainer. Le JSON « hostConfig additionnel » accepte les mêmes clés que le moteur
          Docker (souvent en tête PascalCase).
        </p>
      )}

      <PanneauConfigurationsSauvegardeesCreationConteneurLab
        etatFormulaire={etat}
        surRemplirFormulaire={surRemplirFormulaire}
        surErreur={surErreurConfiguration}
      />
      <BlocJsonCorpsSupplementaireCreationConteneurLab etat={etat} majEtat={majEtat} />

      <BlocIdentiteEtCommandeCreationConteneurLab
        etat={etat}
        majEtat={majEtat}
        jetonSession={jetonSession}
      />
      <BlocOptionsMoteurDockerCreationConteneurLab etat={etat} majEtat={majEtat} />
      <BlocReseauEtEnvironnementCreationConteneurLab etat={etat} majEtat={majEtat} />
      <BlocHoteRuntimeEtMemoireCreationConteneurLab etat={etat} majEtat={majEtat} />
      <BlocSecuriteRessourcesEtJsonCreationConteneurLab etat={etat} majEtat={majEtat} />

      <button type="button" onClick={() => void surCreer()}>
        Créer le conteneur
      </button>
    </section>
  );
}
