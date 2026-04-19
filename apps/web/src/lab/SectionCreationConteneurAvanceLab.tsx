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
  readonly etat: EtatCreationConteneurLab;
  readonly majEtat: (partiel: Partial<EtatCreationConteneurLab>) => void;
  readonly surCreer: () => void;
  readonly surRemplirFormulaire: (nouvelEtat: EtatCreationConteneurLab) => void;
  readonly surErreurConfiguration: (message: string) => void;
  /** Jeton JWT pour charger le catalogue `GET /images` côté formulaire. */
  readonly jetonSession: string;
  /**
   * Masque le paragraphe technique long : utile sur la page « nouveau conteneur » du panel,
   * où l’en-tête de page porte déjà le contexte.
   */
  readonly masquerParagrapheDocumentationApi?: boolean;
  /** Libellés « instance » au lieu de « conteneur » pour le panel PaaS (formulaire expert). */
  readonly terminologieInstance?: boolean;
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
  terminologieInstance = false,
}: Props) {
  const modePanel = masquerParagrapheDocumentationApi;
  let titrePrincipal: string;
  if (modePanel && terminologieInstance) {
    titrePrincipal = "Mode expert — création d’instance";
  } else if (modePanel) {
    titrePrincipal = "Atelier de création";
  } else {
    titrePrincipal = "Créer un conteneur (aide par champ)";
  }
  const libelleBoutonCreer =
    modePanel && terminologieInstance ? "Créer l’instance" : "Créer le conteneur";

  return (
    <section
      className={
        modePanel ? "section-creation-conteneur-panel kp-creation-racine" : undefined
      }
      style={modePanel ? undefined : styleBlocLab}
    >
      <h2 style={modePanel ? undefined : { fontSize: "1rem", marginTop: 0 }}>{titrePrincipal}</h2>
      <aside className="kp-creation-conseil">
        <h3 className="kp-creation-conseil__titre">
          {terminologieInstance
            ? "Création, démarrage et instances qui s’arrêtent aussitôt"
            : "Création, démarrage et conteneurs qui s’arrêtent aussitôt"}
        </h3>
        <div className="kp-creation-conseil__role">
          <TexteAideChampCreationConteneurLab texte={AIDE_CREATION_CONTENEUR_ENTETE} />
        </div>
      </aside>
      {masquerParagrapheDocumentationApi ? null : (
        <p style={{ fontSize: "0.88rem", opacity: 0.88, marginTop: 0 }}>
          Chaque champ ci-dessous comporte un titre lisible et un court texte d’explication. Les noms entre
          parenthèses renvoient aux champs de l’API Docker lorsqu’ils aident à croiser la documentation
          officielle ou Portainer. Le JSON « hostConfig additionnel » accepte les mêmes clés que le moteur
          Docker (souvent en tête PascalCase).
        </p>
      )}

      <div className="kp-creation-flow">
        <PanneauConfigurationsSauvegardeesCreationConteneurLab
          etatFormulaire={etat}
          surRemplirFormulaire={surRemplirFormulaire}
          surErreur={surErreurConfiguration}
          presentationPanel={modePanel}
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
      </div>

      {modePanel ? (
        <div className="kp-creation-actions">
          <button type="button" className="bouton-principal-kido" onClick={() => surCreer()}>
            {libelleBoutonCreer}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => surCreer()}>
          {libelleBoutonCreer}
        </button>
      )}
    </section>
  );
}
