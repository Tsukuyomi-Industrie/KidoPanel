type PropsIcoConsoleJeux = {
  className?: string;
  size?: number;
};

/** Icône console / terminal pour les actions rapides d’une carte serveur. */
export function IcoConsoleJeux({ className, size = 16 }: PropsIcoConsoleJeux) {
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
        d="m4 6 4 6-4 6M12 18h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
