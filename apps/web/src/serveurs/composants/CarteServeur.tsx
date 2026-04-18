import { NavLink } from "react-router-dom";
import type { InstanceServeurJeuxPasserelle } from "../../passerelle/serviceServeursJeuxPasserelle.js";

type PropsCarteServeur = {
  instance: InstanceServeurJeuxPasserelle;
};

/** Carte résumé d’une instance jeu pour la liste du panel. */
export function CarteServeur({ instance }: PropsCarteServeur) {
  return (
    <article className="kp-dash-carte">
      <NavLink
        to={`/serveurs/${encodeURIComponent(instance.id)}`}
        style={{ display: "block", color: "inherit", textDecoration: "none" }}
      >
        <h3 className="kidopanel-titre-section" style={{ marginTop: 0 }}>
          {instance.name}
        </h3>
        <p className="kidopanel-texte-muted">
          {instance.gameType} · {instance.status}
        </p>
        <dl className="kidopanel-liste-definitions">
          <div>
            <dt>Mémoire</dt>
            <dd>{instance.memoryMb} Mo</dd>
          </div>
          <div>
            <dt>CPU</dt>
            <dd>{instance.cpuCores}</dd>
          </div>
        </dl>
      </NavLink>
    </article>
  );
}
