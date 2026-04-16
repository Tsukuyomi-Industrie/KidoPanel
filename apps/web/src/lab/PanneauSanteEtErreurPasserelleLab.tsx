import {
  enrichirTexteErreurPourAffichage,
} from "./passerelleErreursAffichageLab.js";
import { composerUrlPasserelle } from "./passerelleClient.js";
import { styleBlocLab, stylePreLab } from "./stylesCommunsLab.js";

type Props = {
  etatSondePasserelle: "en_cours" | "ok" | "echec";
  texteSondePasserelle: string;
  surReverifierPasserelle: () => void;
  messageErreur: string | null;
  refUrlContexteErreur: { current: string };
};

/** Affiche la sonde `/health` et le bandeau d’erreur contextualisé du laboratoire passerelle. */
export function PanneauSanteEtErreurPasserelleLab({
  etatSondePasserelle,
  texteSondePasserelle,
  surReverifierPasserelle,
  messageErreur,
  refUrlContexteErreur,
}: Props) {
  return (
    <>
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
          onClick={() => void surReverifierPasserelle()}
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
    </>
  );
}
