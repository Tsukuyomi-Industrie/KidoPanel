type PropsIcoContainer = {
  readonly className?: string;
  readonly size?: number;
};

/** Icône container applicatif pour le rail de navigation. */
export function IcoContainer({ className, size = 16 }: PropsIcoContainer) {
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
        d="M8 8h8v10H8V8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 12h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path
        d="M10 6h4v2h-4V6z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
