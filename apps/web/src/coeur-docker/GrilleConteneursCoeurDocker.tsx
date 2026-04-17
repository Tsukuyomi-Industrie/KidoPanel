import type { ResumeConteneurLab } from "../lab/typesConteneurLab.js";

function nomAffiche(conteneur: ResumeConteneurLab): string {
  const n = conteneur.names[0];
  if (typeof n === "string" && n.length > 0) {
    return n.replace(/^\//, "");
  }
  return conteneur.id.slice(0, 12) + "…";
}

function formaterPorts(conteneur: ResumeConteneurLab): string {
  const ports = conteneur.ports;
  if (!Array.isArray(ports) || ports.length === 0) {
    return "—";
  }
  return ports
    .map((p) => {
      const interne = `${String(p.privatePort)}/${p.type}`;
      if (p.publicPort !== undefined && p.publicPort !== 0) {
        const hote = p.ip && p.ip !== "" ? p.ip : "*";
        return `${interne} → ${String(p.publicPort)} (${hote})`;
      }
      return `${interne} (interne)`;
    })
    .join(" · ");
}

function ipInternePrincipale(conteneur: ResumeConteneurLab): string {
  const ports = conteneur.ports;
  if (!Array.isArray(ports)) {
    return "—";
  }
  const avecIp = ports.find((p) => typeof p.ip === "string" && p.ip !== "" && p.ip !== "0.0.0.0");
  return avecIp?.ip ?? "—";
}

type Props = {
  conteneurs: ResumeConteneurLab[];
  idSelectionne: string;
  surSelection: (id: string) => void;
  chargementListe: boolean;
  surRafraichir: () => void;
  surDemarrer: (id: string) => void;
  surArreter: (id: string) => void;
  surSupprimer: (id: string) => void;
};

/**
 * Tableau dense des conteneurs : nom Docker, image, état, ports, adresse IP associée aux publications.
 */
export function GrilleConteneursCoeurDocker({
  conteneurs,
  idSelectionne,
  surSelection,
  chargementListe,
  surRafraichir,
  surDemarrer,
  surArreter,
  surSupprimer,
}: Props) {
  return (
    <section className="kidopanel-carte-principale">
      <div className="kidopanel-entete-section">
        <h2 className="kidopanel-titre-section">Conteneurs sous votre contrôle</h2>
        <button
          type="button"
          className="bouton-secondaire-kido"
          disabled={chargementListe}
          onClick={() => void surRafraichir()}
        >
          {chargementListe ? "Actualisation…" : "Actualiser"}
        </button>
      </div>
      <div className="kidopanel-table-wrap">
        <table className="kidopanel-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Image</th>
              <th>État</th>
              <th>Ports</th>
              <th>IP liée aux ports</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {conteneurs.map((c) => {
              const selection = c.id === idSelectionne;
              return (
                <tr
                  key={c.id}
                  className={selection ? "kidopanel-ligne-selectionnee" : undefined}
                  onClick={() => surSelection(c.id)}
                >
                  <td>
                    <span className="kidopanel-nom-docker">{nomAffiche(c)}</span>
                    <span className="kidopanel-id-court">{c.id.slice(0, 14)}…</span>
                  </td>
                  <td title={c.image}>{c.image}</td>
                  <td>
                    <span className={`kidopanel-pill-etat kidopanel-etat--${c.state}`}>
                      {c.state}
                    </span>
                    <div className="kidopanel-status-secondaire">{c.status}</div>
                  </td>
                  <td className="kidopanel-cellule-mono">{formaterPorts(c)}</td>
                  <td className="kidopanel-cellule-mono">{ipInternePrincipale(c)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="kidopanel-actions-ligne">
                      <button
                        type="button"
                        className="bouton-ghost-kido"
                        onClick={() => void surDemarrer(c.id)}
                      >
                        Démarrer
                      </button>
                      <button
                        type="button"
                        className="bouton-ghost-kido"
                        onClick={() => void surArreter(c.id)}
                      >
                        Arrêter
                      </button>
                      <button
                        type="button"
                        className="bouton-ghost-kido kidopanel-action-danger"
                        onClick={() => void surSupprimer(c.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {conteneurs.length === 0 && !chargementListe ? (
        <p className="kidopanel-texte-muted">Aucun conteneur associé à ce compte pour l’instant.</p>
      ) : null}
    </section>
  );
}
