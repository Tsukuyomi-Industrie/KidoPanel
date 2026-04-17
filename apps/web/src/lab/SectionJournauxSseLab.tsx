import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useFluxJournauxConteneur } from "../hooks/useFluxJournauxConteneur.js";
import { enrichirTexteErreurPourAffichage } from "./passerelleErreursAffichageLab.js";
import {
  composerUrlPasserelle,
  urlBasePasserelle,
} from "./passerelleClient.js";
import { styleBlocLab, stylePreLab } from "./stylesCommunsLab.js";
import { styleVueJournauxConteneurLab } from "./style-vue-journaux-conteneur.lab.js";

const VALEURS_TAIL: readonly number[] = [100, 200, 500, 1000, 5000];

type PropsSectionJournauxSseLab = {
  idSelectionne: string;
  jeton: string;
  fluxJournauxActif: boolean;
  setFluxJournauxActif: (actif: boolean) => void;
};

const styleBarreOutils: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.45rem",
  alignItems: "center",
  marginTop: "0.35rem",
  marginBottom: "0.35rem",
  fontSize: "0.82rem",
};

const styleChampCompact: CSSProperties = {
  fontSize: "0.82rem",
  padding: "0.2rem 0.35rem",
  maxWidth: "100%",
};

/**
 * Console de journaux conteneur : flux SSE unique (paramètre `tail` côté Docker, sans doublon GET),
 * réglages tail / horodatages, filtre, défilement auto, copie et téléchargement.
 */
export function SectionJournauxSseLab({
  idSelectionne,
  jeton,
  fluxJournauxActif,
  setFluxJournauxActif,
}: PropsSectionJournauxSseLab) {
  const [tailEntrees, setTailEntrees] = useState(500);
  const [horodatagesDocker, setHorodatagesDocker] = useState(true);
  const [retourALaLigne, setRetourALaLigne] = useState(true);
  const [filtreTexte, setFiltreTexte] = useState("");
  const [defilementAuto, setDefilementAuto] = useState(true);
  const refConteneurVue = useRef<HTMLPreElement>(null);
  const urlBaseMemoisee = useMemo(() => urlBasePasserelle(), []);

  const { lignes, etatConnexion, dernierMessageErreur, effacer } =
    useFluxJournauxConteneur({
      urlBasePasserelle: urlBaseMemoisee,
      idConteneur: idSelectionne,
      jetonBearer: jeton,
      actif: fluxJournauxActif,
      tailEntrees,
      horodatageDocker: horodatagesDocker,
      surFinFluxNaturelle: () => {
        setFluxJournauxActif(false);
      },
    });

  const lignesFiltrees = useMemo(() => {
    const q = filtreTexte.trim().toLowerCase();
    if (q === "") {
      return lignes;
    }
    return lignes.filter((l) => l.toLowerCase().includes(q));
  }, [lignes, filtreTexte]);

  const texteExport = useMemo(() => lignesFiltrees.join("\n"), [lignesFiltrees]);

  useLayoutEffect(() => {
    if (!defilementAuto || !refConteneurVue.current) {
      return;
    }
    const el = refConteneurVue.current;
    el.scrollTop = el.scrollHeight;
  }, [lignesFiltrees, defilementAuto, fluxJournauxActif]);

  const telechargerFichier = (): void => {
    const idCourt =
      idSelectionne.trim().length > 12
        ? idSelectionne.trim().slice(0, 12)
        : idSelectionne.trim() || "conteneur";
    const blob = new Blob([texteExport], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journaux-${idCourt}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copierPressePapiers = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(texteExport);
    } catch {
      /* navigateur ou contexte non sécurisé : ignoré */
    }
  };

  const styleVue: CSSProperties = {
    ...styleVueJournauxConteneurLab,
    whiteSpace: retourALaLigne ? "pre-wrap" : "pre",
    wordBreak: retourALaLigne ? "break-word" : "normal",
  };

  return (
    <section style={styleBlocLab}>
      <h2 style={{ fontSize: "1rem", marginTop: 0 }}>
        Journaux conteneur (vue type Portainer)
      </h2>
      <p style={{ fontSize: "0.85rem", opacity: 0.85 }}>
        Identifiant :{" "}
        <code>{idSelectionne || "(aucun — sélectionner une ligne)"}</code>
        {" — "}
        Flux unique <code>…/logs/stream</code> (paramètre <code>tail</code>{" "}
        côté Docker). À la fin du flux (conteneur arrêté ou fermeture amont),
        l’onglet se désactive automatiquement.
      </p>

      <div style={styleBarreOutils}>
        <label>
          Dernières lignes (tail){" "}
          <select
            style={styleChampCompact}
            value={tailEntrees}
            disabled={fluxJournauxActif}
            onChange={(e) => {
              setTailEntrees(Number(e.target.value));
            }}
          >
            {VALEURS_TAIL.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={horodatagesDocker}
            disabled={fluxJournauxActif}
            onChange={(e) => {
              setHorodatagesDocker(e.target.checked);
            }}
          />
          Horodatages Docker
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={retourALaLigne}
            onChange={(e) => {
              setRetourALaLigne(e.target.checked);
            }}
          />
          Retour à la ligne
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={defilementAuto}
            onChange={(e) => {
              setDefilementAuto(e.target.checked);
            }}
          />
          Défilement auto
        </label>
      </div>

      <div style={{ ...styleBarreOutils, marginTop: 0 }}>
        <input
          type="search"
          placeholder="Filtrer les lignes affichées…"
          value={filtreTexte}
          onChange={(e) => {
            setFiltreTexte(e.target.value);
          }}
          style={{ ...styleChampCompact, flex: "1 1 180px", minWidth: 120 }}
        />
        <span style={{ opacity: 0.85 }}>
          {lignesFiltrees.length}/{lignes.length} ligne(s)
        </span>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: 6 }}>
        <button
          type="button"
          disabled={!idSelectionne.trim()}
          onClick={() => {
            setFluxJournauxActif(true);
          }}
        >
          Ouvrir le flux
        </button>
        <button
          type="button"
          onClick={() => {
            setFluxJournauxActif(false);
          }}
        >
          Fermer le flux
        </button>
        <button type="button" onClick={effacer}>
          Effacer le tampon
        </button>
        <button
          type="button"
          disabled={lignesFiltrees.length === 0}
          onClick={() => {
            void copierPressePapiers();
          }}
        >
          Copier (filtré)
        </button>
        <button
          type="button"
          disabled={lignesFiltrees.length === 0}
          onClick={telechargerFichier}
        >
          Télécharger .txt
        </button>
      </div>

      <p style={{ fontSize: "0.85rem", marginTop: 8 }}>
        Connexion : <strong>{etatConnexion}</strong>
        {fluxJournauxActif ? (
          <span style={{ opacity: 0.8 }}>
            {" "}
            (modifier « tail » ou « horodatages » : fermer le flux d’abord)
          </span>
        ) : null}
      </p>

      {dernierMessageErreur ? (
        <pre
          style={{
            ...stylePreLab,
            marginTop: 6,
            fontSize: "0.8rem",
            maxHeight: "min(55vh, 420px)",
            minHeight: "3rem",
            overflow: "auto",
            borderColor: "#a33",
            color: "#f8b4b4",
          }}
        >
          {enrichirTexteErreurPourAffichage(
            dernierMessageErreur,
            idSelectionne.trim() === ""
              ? `${urlBasePasserelle()}/containers/…/logs/stream`
              : composerUrlPasserelle(
                  `/containers/${encodeURIComponent(idSelectionne.trim())}/logs/stream`,
                ),
          )}
        </pre>
      ) : null}

      <pre ref={refConteneurVue} style={styleVue}>
        {lignesFiltrees.join("\n")}
      </pre>
    </section>
  );
}
