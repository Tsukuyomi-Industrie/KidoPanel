import { Link } from "react-router-dom";
import type { InstanceServeurJeuxPasserelle } from "../passerelle/serviceServeursJeuxPasserelle.js";
import type { IndicateursTableauPasserelle } from "../passerelle/serviceIndicateursPasserelle.js";
import { urlBasePasserelle } from "../passerelle/url-base-passerelle.js";
import { BadgeStatut } from "./BadgeStatut.js";
import { IcoDocker } from "./icones/IcoDocker.js";
import { SparklineActivite } from "./SparklineActivite.js";
import { statutBadgeDepuisChaineApi } from "./statutBadgeInstanceJeux.js";

type PropsTableauBordPresentationKidoPanel = {
  donnees: IndicateursTableauPasserelle | null;
  instancesJeux: InstanceServeurJeuxPasserelle[];
  chargement: boolean;
  erreur: string | null;
  surRecharger: () => void;
};

function serieNormaliseeInstancesActives(
  instances: InstanceServeurJeuxPasserelle[],
): number[] {
  const running = instances.filter((i) => i.status.toUpperCase() === "RUNNING").length;
  const total = instances.length;
  const ratio = total === 0 ? 0 : running / total;
  return Array.from({ length: 14 }, (_, i) =>
    Math.min(1, Math.max(0.08, ratio + Math.sin(i * 0.55) * 0.04)),
  );
}

/**
 * Tableau de bord opérationnel : métriques concrètes, tendance des instances jeu et état des services.
 */
export function TableauBordPresentationKidoPanel({
  donnees,
  instancesJeux,
  chargement,
  erreur,
  surRecharger,
}: PropsTableauBordPresentationKidoPanel) {
  const instancesActives = instancesJeux.filter(
    (i) => i.status.toUpperCase() === "RUNNING",
  ).length;
  const recentes = instancesJeux.slice(0, 5);
  const serieSparkline = serieNormaliseeInstancesActives(instancesJeux);

  return (
    <div className="kp-dash-travail">
      <div className="kp-page-entete">
        <div>
          <h1 className="kp-page-titre">Tableau de bord</h1>
          <p className="kp-page-sous-titre">Vue synthétique de votre périmètre et des services.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" className="kp-btn kp-btn--secondaire kp-btn--sm" onClick={() => void surRecharger()}>
            Actualiser
          </button>
          <Link to="/coeur-docker" className="kp-btn kp-btn--secondaire kp-btn--sm">
            Cœur Docker
          </Link>
          <Link to="/serveurs" className="kp-btn kp-btn--primaire kp-btn--sm">
            Serveurs de jeu
          </Link>
        </div>
      </div>

      {erreur !== null ? <div className="bandeau-erreur-auth kp-dash-erreur">{erreur}</div> : null}

      <div className="kp-metrique-grille" aria-busy={chargement}>
        <article className="kp-metrique-carte kp-metrique-carte--cyan">
          <IcoDocker className="kp-metrique-carte__ico-bg" size={52} />
          <span className="kp-metrique-carte__label">Conteneurs visibles</span>
          <p className="kp-metrique-carte__valeur">
            {chargement || donnees === null ? "—" : String(donnees.conteneurs.total)}
          </p>
          <span className="kp-metrique-carte__detail">Périmètre passerelle</span>
        </article>
        <article className="kp-metrique-carte kp-metrique-carte--green">
          <span className="kp-metrique-carte__label">Conteneurs en ligne</span>
          <p className="kp-metrique-carte__valeur">
            {chargement || donnees === null ? "—" : String(donnees.conteneurs.enLigne)}
          </p>
          <span className="kp-metrique-carte__detail">
            Hors ligne :{" "}
            {chargement || donnees === null ? "—" : String(donnees.conteneurs.horsLigne)}
          </span>
        </article>
        <article className="kp-metrique-carte kp-metrique-carte--purple">
          <span className="kp-metrique-carte__label">Instances jeu actives</span>
          <p className="kp-metrique-carte__valeur">{String(instancesActives)}</p>
          <span className="kp-metrique-carte__detail">Sur {String(instancesJeux.length)} instance(s) listée(s)</span>
        </article>
        <article className="kp-metrique-carte kp-metrique-carte--amber">
          <span className="kp-metrique-carte__label">Latence PostgreSQL</span>
          <p className="kp-metrique-carte__valeur">
            {chargement || donnees === null
              ? "—"
              : donnees.postgresql.latenceMs !== undefined
                ? `${String(donnees.postgresql.latenceMs)} ms`
                : "N/D"}
          </p>
          <span className="kp-metrique-carte__detail">
            {donnees?.postgresql.joignable === false ? "Sonde injoignable" : "Sonde passerelle"}
          </span>
        </article>
      </div>

      <section className="kp-panel-section">
        <div className="kp-dash-vedette__corps">
          <div>
            <h2 className="kp-section-label" style={{ marginBottom: "0.35rem" }}>
              Instances jeu actives
            </h2>
            <p className="kp-metrique-carte__valeur" style={{ fontSize: "2rem", margin: 0 }}>
              {String(instancesActives)}
            </p>
            <p className="kp-texte-muted" style={{ fontSize: "0.78rem", marginTop: "0.35rem" }}>
              Courbe indicative liée à la part d’instances en ligne sur la liste récente.
            </p>
          </div>
          <SparklineActivite serie={serieSparkline} />
        </div>
      </section>

      <section className="kp-panel-section">
        <div className="kp-panel-section__entete">
          <h2 className="kp-panel-section__titre">Instances récentes</h2>
          <Link to="/serveurs" className="kp-panel-section__action">
            Voir tout
          </Link>
        </div>
        <table className="kp-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Jeu</th>
              <th>Statut</th>
              <th>Port</th>
            </tr>
          </thead>
          <tbody>
            {recentes.length === 0 ? (
              <tr>
                <td colSpan={4} className="kp-texte-muted" style={{ padding: "1.25rem" }}>
                  Aucune instance jeu chargée (service désactivé ou liste vide).
                </td>
              </tr>
            ) : (
              recentes.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link className="kp-lien-inline" to={`/serveurs/${encodeURIComponent(row.id)}`}>
                      {row.name}
                    </Link>
                  </td>
                  <td>{row.gameType}</td>
                  <td>
                    <BadgeStatut statut={statutBadgeDepuisChaineApi(row.status)} />
                  </td>
                  <td>
                    <span className="kp-cellule-mono">—</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="kp-panel-corps">
        <h2 className="kp-section-label">État des services</h2>
        <div className="kp-services-grille">
          <div>
            <p className="kp-texte-muted" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              PostgreSQL
            </p>
            <p style={{ margin: "0.35rem 0 0", fontWeight: 600, color: "var(--kp-text-primary)" }}>
              {chargement || donnees === null
                ? "…"
                : donnees.postgresql.joignable
                  ? "Joignable"
                  : "Injoignable"}
            </p>
            {donnees?.postgresql.message !== undefined ? (
              <p className="kp-texte-muted" style={{ fontSize: "0.78rem", marginTop: "0.35rem" }}>
                {donnees.postgresql.message}
              </p>
            ) : null}
          </div>
          <div>
            <p className="kp-texte-muted" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Moteur Docker
            </p>
            <p style={{ margin: "0.35rem 0 0", fontWeight: 600, color: "var(--kp-text-primary)" }}>
              {chargement || donnees === null
                ? "…"
                : donnees.moteurDocker.joignable
                  ? "Joignable"
                  : "Injoignable"}
            </p>
            {donnees?.moteurDocker.message !== undefined ? (
              <p className="kp-texte-muted" style={{ fontSize: "0.78rem", marginTop: "0.35rem" }}>
                {donnees.moteurDocker.message}
              </p>
            ) : null}
          </div>
        </div>
        <p className="kp-texte-muted" style={{ fontSize: "0.78rem", marginTop: "1rem" }}>
          Passerelle : <code className="kp-cellule-mono">{urlBasePasserelle()}</code>
        </p>
      </section>
    </div>
  );
}
