type PropsIcoArret = {
  readonly className?: string;
  readonly size?: number;
};

/** Icône arrêt pour les actions rapides d’une carte serveur. */
export function IcoArret({ className, size = 16 }: PropsIcoArret) {
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
      <path
        d="M7 7h10v10H7V7z"
        fill="currentColor"
      />
    </svg>
  );
}
