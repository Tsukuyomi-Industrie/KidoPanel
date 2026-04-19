type PropsIcoDocker = {
  readonly className?: string;
  readonly size?: number;
};

/** Icône conteneur / Docker pour le rail de navigation. */
export function IcoDocker({ className, size = 16 }: PropsIcoDocker) {
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
        d="M7 10V7H4v3M10 10V7H7v3M13 10V7h-3v3M16 10V7h-3v3M10 13v-3H7v3M13 13v-3h-3v3M16 13v-3h-3v3M19 14h-1.5a3 3 0 0 1-3 3V18h5v-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 18h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
