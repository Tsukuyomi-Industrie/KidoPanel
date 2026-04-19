import type { EnregistrementReseauInternePasserelle } from "../../passerelle/serviceReseauxInternesPasserelle.js";

type PropsCarteReseau = {
  readonly reseau: EnregistrementReseauInternePasserelle;
  readonly nombreInstancesLiees: number;
  readonly surSupprimer: (id: string) => void;
  readonly peutSupprimer: boolean;
};

/** Résumé d’un pont réseau utilisateur avec état d’isolement Internet. */
export function CarteReseau({
  reseau,
  nombreInstancesLiees,
  surSupprimer,
  peutSupprimer,
}: PropsCarteReseau) {
  return (
    <article className="kp-dash-carte">
      <h3 style={{ marginTop: 0 }}>{reseau.nomAffichage}</h3>
      <p className="kp-cellule-mono" style={{ fontSize: "0.88rem" }}>
        {reseau.sousReseauCidr}
      </p>
      <p style={{ margin: "0.35rem 0" }}>
        Passerelle : <span className="kp-cellule-mono">{reseau.passerelleIpv4}</span>
      </p>
      <p style={{ margin: "0.35rem 0" }}>
        Containers rattachés : <strong>{String(nombreInstancesLiees)}</strong>
      </p>
      <p style={{ marginBottom: "0.75rem" }}>
        {reseau.sansRouteVersInternetExterne ? (
          <span style={{ color: "var(--kp-attention)" }}>Isolé</span>
        ) : (
          <span style={{ color: "var(--kp-accent)" }}>Internet activé</span>
        )}
      </p>
      <button
        type="button"
        className="kp-btn kp-btn--danger kp-btn--sm"
        disabled={!peutSupprimer}
        title={
          peutSupprimer
            ? "Supprimer ce pont"
            : "Des instances utilisent encore ce réseau."
        }
        onClick={() => surSupprimer(reseau.id)}
      >
        Supprimer
      </button>
    </article>
  );
}
