type PropsIcoDemarrer = {
  readonly className?: string;
  readonly size?: number;
};

/** Icône lecture / démarrage pour les actions rapides d’une carte serveur. */
export function IcoDemarrer({ className, size = 16 }: PropsIcoDemarrer) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M8 5v14l11-7-11-7z" fill="currentColor" />
    </svg>
  );
}
