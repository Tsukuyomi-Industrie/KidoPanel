export type StatutInstanceBadge =
  | "running"
  | "stopped"
  | "starting"
  | "stopping"
  | "crashed"
  | "error"
  | "installing";

const LIBELLES_STATUT: Record<StatutInstanceBadge, string> = {
  running: "En ligne",
  stopped: "Arrêté",
  starting: "Démarrage",
  stopping: "Arrêt",
  crashed: "Planté",
  error: "Erreur",
  installing: "Installation",
};

type PropsBadgeStatut = {
  readonly statut: StatutInstanceBadge;
};

/** Pastille d’état d’instance avec couleur et animation selon le cycle de vie. */
export function BadgeStatut({ statut }: PropsBadgeStatut) {
  return (
    <span className={`kp-statut kp-statut--${statut}`}>
      <span className="kp-statut__point" aria-hidden="true" />
      {LIBELLES_STATUT[statut]}
    </span>
  );
}
