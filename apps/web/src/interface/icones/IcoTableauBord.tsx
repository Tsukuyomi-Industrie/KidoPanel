type PropsIcoTableauBord = {
  className?: string;
  size?: number;
};

/** Icône grille / tableau de bord pour le rail de navigation. */
export function IcoTableauBord({ className, size = 16 }: PropsIcoTableauBord) {
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
        d="M4 5h6v6H4V5zm10 0h6v4h-6V5zM4 13h6v6H4v-6zm10 3h6v4h-6v-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
