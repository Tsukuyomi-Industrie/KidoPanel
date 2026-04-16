import type { ResumeConteneurLab } from "./typesConteneurLab.js";
import { styleBlocLab } from "./stylesCommunsLab.js";

type PropsSectionConteneursLab = {
  conteneurs: ResumeConteneurLab[];
  idSelectionne: string;
  setIdSelectionne: (id: string) => void;
  rafraichirListe: () => void;
  chargementListe: boolean;
  actionConteneur: (
    id: string,
    methode: "POST" | "DELETE",
    cheminSuffixe: string,
  ) => void;
};

/** Liste des conteneurs avec actions start / stop / delete et rafraîchissement. */
export function SectionListeConteneursLab({
  conteneurs,
  idSelectionne,
  setIdSelectionne,
  rafraichirListe,
  chargementListe,
  actionConteneur,
}: PropsSectionConteneursLab) {
  return (
    <section style={styleBlocLab}>
      <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Conteneurs</h2>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => void rafraichirListe()}
          disabled={chargementListe}
        >
          {chargementListe ? "Chargement…" : "Rafraîchir la liste"}
        </button>
      </div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {conteneurs.map((c) => {
          const selection = c.id === idSelectionne;
          return (
            <li
              key={c.id}
              style={{
                marginTop: 8,
                padding: 8,
                border: selection ? "2px solid #6ae" : "1px solid #555",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              <button
                type="button"
                onClick={() => setIdSelectionne(c.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <strong>{c.id.slice(0, 12)}…</strong> — {c.state} —{" "}
                <span style={{ opacity: 0.9 }}>{c.status}</span>
                {c.names[0] ? (
                  <span style={{ display: "block", fontSize: "0.85rem" }}>
                    {c.names[0]}
                  </span>
                ) : null}
              </button>
              <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => void actionConteneur(c.id, "POST", "/start")}
                >
                  Démarrer
                </button>
                <button
                  type="button"
                  onClick={() => void actionConteneur(c.id, "POST", "/stop")}
                >
                  Arrêter
                </button>
                <button
                  type="button"
                  onClick={() => void actionConteneur(c.id, "DELETE", "")}
                >
                  Supprimer
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {conteneurs.length === 0 ? (
        <p style={{ fontSize: "0.9rem", opacity: 0.8 }}>
          Aucun conteneur listé (connectez-vous puis rafraîchissez).
        </p>
      ) : null}
    </section>
  );
}

