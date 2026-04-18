type PropsIcoServeurs = {
  className?: string;
  size?: number;
};

/** Icône serveurs de jeu pour le rail de navigation. */
export function IcoServeurs({ className, size = 16 }: PropsIcoServeurs) {
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
        d="M5 5h14v4H5V5zm0 10h14v4H5v-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8h.01M8 18h.01M16 8h.01M16 18h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
