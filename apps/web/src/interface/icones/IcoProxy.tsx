type PropsIcoProxy = {
  readonly className?: string;
  readonly size?: number;
};

/** Icône proxy / relais HTTP pour le rail de navigation. */
export function IcoProxy({ className, size = 16 }: PropsIcoProxy) {
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
        d="M5 12h5l-2 3M19 12h-5l2 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 7v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
