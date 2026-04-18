type PropsIcoAudit = {
  className?: string;
  size?: number;
};

/** Icône journal d’audit pour la section administration. */
export function IcoAudit({ className, size = 16 }: PropsIcoAudit) {
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
        d="M9 5H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M9 5a2 2 0 0 1 2-2h4l6 6v11a2 2 0 0 1-2 2h-2M9 5v6h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
