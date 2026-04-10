/**
 * Lecture centralisée des variables d’environnement de la passerelle
 * (URL du container-engine, fenêtre de limitation de débit).
 */
export type GatewayEnv = {
  rateLimitMax: number;
  rateLimitWindowMs: number;
};

/** Retourne l’URL de base du container-engine, sans barre oblique finale. */
export function getContainerEngineBaseUrl(): string {
  const brut = process.env.CONTAINER_ENGINE_BASE_URL?.trim();
  const defaut = "http://127.0.0.1:8787";
  if (!brut) return defaut;
  return brut.replace(/\/+$/, "");
}

/** Construit la configuration de limitation de débit à partir des variables d’environnement. */
export function loadGatewayEnv(): GatewayEnv {
  const max = Number(process.env.GATEWAY_RATE_LIMIT_MAX ?? "120");
  const fenetreMs = Number(process.env.GATEWAY_RATE_LIMIT_WINDOW_MS ?? "60000");
  return {
    rateLimitMax: Number.isFinite(max) && max > 0 ? max : 120,
    rateLimitWindowMs:
      Number.isFinite(fenetreMs) && fenetreMs > 0 ? fenetreMs : 60_000,
  };
}
