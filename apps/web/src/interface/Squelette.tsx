import type { CSSProperties } from "react";

type PropsSquelette = {
  readonly className?: string;
  readonly style?: CSSProperties;
};

/** Zone animée pour signaler un chargement sans inventer de contenu métier. */
export function Squelette({ className, style }: PropsSquelette) {
  return <div className={`kp-squelette ${className ?? ""}`.trim()} style={style} aria-hidden />;
}
