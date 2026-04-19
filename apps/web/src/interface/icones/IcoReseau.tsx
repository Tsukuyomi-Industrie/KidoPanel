type PropsIcoReseau = {
  readonly className?: string;
  readonly size?: number;
};

/** Icône lien réseau pour le rail de navigation. */
export function IcoReseau({ className, size = 16 }: PropsIcoReseau) {
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
      <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 6h8M6 8v8M18 8v8M8 18h8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
