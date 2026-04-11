import { useFluxJournauxConteneur } from "../hooks/useFluxJournauxConteneur.js";
import { urlBasePasserelle } from "./passerelleClient.js";
import { styleBlocLab, stylePreLab } from "./stylesCommunsLab.js";

type PropsSectionJournauxSseLab = {
  idSelectionne: string;
  jeton: string;
  fluxJournauxActif: boolean;
  setFluxJournauxActif: (actif: boolean) => void;
};

/**
 * Affiche le flux SSE `/containers/:id/logs/stream` pour le conteneur sélectionné,
 * avec ouverture / fermeture explicite du flux.
 */
export function SectionJournauxSseLab({
  idSelectionne,
  jeton,
  fluxJournauxActif,
  setFluxJournauxActif,
}: PropsSectionJournauxSseLab) {
  const { lignes, etatConnexion, dernierMessageErreur, effacer } =
    useFluxJournauxConteneur({
      urlBasePasserelle: urlBasePasserelle(),
      idConteneur: idSelectionne,
      jetonBearer: jeton,
      actif: fluxJournauxActif,
      tailEntrees: 200,
      horodatageDocker: true,
    });

  return (
    <section style={styleBlocLab}>
      <h2 style={{ fontSize: "1rem", marginTop: 0 }}>
        Journaux SSE (conteneur sélectionné)
      </h2>
      <p style={{ fontSize: "0.85rem", opacity: 0.85 }}>
        Identifiant sélectionné :{" "}
        <code>{idSelectionne || "(aucun — cliquer une ligne ci-dessus)"}</code>
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={!idSelectionne.trim()}
          onClick={() => setFluxJournauxActif(true)}
        >
          Ouvrir le flux
        </button>
        <button type="button" onClick={() => setFluxJournauxActif(false)}>
          Fermer le flux
        </button>
        <button type="button" onClick={effacer}>
          Effacer l’affichage
        </button>
      </div>
      <p style={{ fontSize: "0.85rem", marginTop: 8 }}>
        État connexion : <strong>{etatConnexion}</strong>
      </p>
      {dernierMessageErreur ? (
        <pre
          style={{
            ...stylePreLab,
            marginTop: 6,
            fontSize: "0.8rem",
            maxHeight: 220,
            overflow: "auto",
            borderColor: "#a33",
            color: "#f8b4b4",
          }}
        >
          {dernierMessageErreur}
        </pre>
      ) : null}
      <pre style={{ ...stylePreLab, maxHeight: 320 }}>{lignes.join("\n")}</pre>
    </section>
  );
}
