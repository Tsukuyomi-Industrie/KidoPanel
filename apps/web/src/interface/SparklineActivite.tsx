type PropsSparklineActivite = {
  serie: number[];
};

/**
 * Courbe SVG discrète pour visualiser une tendance relative à partir d’une série normalisée.
 */
export function SparklineActivite({ serie }: PropsSparklineActivite) {
  const largeur = 120;
  const hauteur = 40;
  const pad = 2;
  const maxi = Math.max(...serie, 0.01);
  const pts = serie.map((v, i) => {
    const x = pad + (i / Math.max(serie.length - 1, 1)) * (largeur - pad * 2);
    const y = hauteur - pad - (v / maxi) * (hauteur - pad * 2);
    return `${String(x)},${String(y)}`;
  });

  return (
    <svg
      className="kp-sparkline"
      width={largeur}
      height={hauteur}
      viewBox={`0 0 ${String(largeur)} ${String(hauteur)}`}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts.join(" ")}
      />
    </svg>
  );
}
