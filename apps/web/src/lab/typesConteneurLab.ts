/** Publication de port telle que renvoyée par le moteur dans la liste des conteneurs. */
export type PortResumeConteneurLab = {
  privatePort: number;
  publicPort?: number;
  type: string;
  ip?: string;
};

/** Résumé conteneur tel que renvoyé par `GET /containers` (moteur / passerelle). */
export type ResumeConteneurLab = {
  id: string;
  state: string;
  status: string;
  names: string[];
  image: string;
  /** Présent lorsque le moteur expose les liaisons de ports Docker. */
  ports?: PortResumeConteneurLab[];
};
