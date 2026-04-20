import { normaliserUrlBasePourFetchLoopbackIpv4 } from "./normaliser-url-loopback-ipv4.js";

/**
 * Lecture centralisée des variables d’environnement de la passerelle
 * (URL du container-engine, limitation de débit, secrets JWT, coût bcrypt, base PostgreSQL).
 */
export type GatewayEnv = {
  rateLimitMax: number;
  rateLimitWindowMs: number;
  /** Secret brut pour signature et vérification JWT (HS256). */
  jwtSecretBrut: string;
  /** Durée de vie des jetons d’accès émis à la connexion. */
  jwtExpiresSeconds: number;
  /** Coût bcrypt (facteur de travail) pour le hachage des mots de passe. */
  bcryptCost: number;
  /** Chaîne de connexion Prisma vers PostgreSQL (utilisateurs et propriétés de conteneurs). */
  databaseUrl: string;
  /**
   * URL de base du service instances jeu : par défaut `http://127.0.0.1:8790` (aligné sur SERVER_SERVICE_PORT).
   * Définir `SERVER_SERVICE_DISABLED=1` pour désactiver explicitement le relais `/serveurs-jeux`.
   */
  serverServiceBaseUrl: string | undefined;
  /**
   * URL de base du service web (instances applicatives + proxy) : par défaut `http://127.0.0.1:8791`.
   * `WEB_SERVICE_DISABLED=1` ou `true` désactive les relais `/web-instances` et `/proxy`.
   */
  webServiceBaseUrl: string | undefined;
};

const URL_SERVEUR_JEUX_LOCAL_PAR_DEFAUT = "http://127.0.0.1:8790";
const URL_SERVICE_WEB_LOCAL_PAR_DEFAUT = "http://127.0.0.1:8791";

function variableBooleenneActive(variable: string | undefined): boolean {
  const brut = variable?.trim();
  return brut === "1" || brut?.toLowerCase() === "true";
}

function resoudreUrlServiceBase(params: {
  urlBrute: string | undefined;
  desactive: boolean;
  valeurParDefaut: string;
}): string | undefined {
  if (params.desactive) {
    return undefined;
  }
  const candidate = params.urlBrute?.trim();
  if (candidate !== undefined && candidate.length > 0) {
    return normaliserUrlBasePourFetchLoopbackIpv4(candidate.replace(/\/+$/, ""));
  }
  return normaliserUrlBasePourFetchLoopbackIpv4(params.valeurParDefaut);
}

/** Retourne l’URL de base du container-engine, sans barre oblique finale. */
export function getContainerEngineBaseUrl(): string {
  const brut = process.env.CONTAINER_ENGINE_BASE_URL?.trim();
  const defaut = "http://127.0.0.1:8787";
  if (!brut) return defaut;
  return normaliserUrlBasePourFetchLoopbackIpv4(brut.replace(/\/+$/, ""));
}

/** Encode le secret JWT pour les API `jose` (signature et vérification). */
export function encoderSecretJwt(env: GatewayEnv): Uint8Array {
  return new TextEncoder().encode(env.jwtSecretBrut);
}

/**
 * Construit la configuration complète à partir des variables d’environnement.
 * Sans `GATEWAY_JWT_SECRET` ou `DATABASE_URL`, la passerelle refuse le démarrage avec un message explicite.
 */
export function loadGatewayEnv(): GatewayEnv {
  const max = Number(process.env.GATEWAY_RATE_LIMIT_MAX ?? "120");
  const fenetreMs = Number(process.env.GATEWAY_RATE_LIMIT_WINDOW_MS ?? "60000");
  const jwtSecretBrut = process.env.GATEWAY_JWT_SECRET?.trim() ?? "";
  if (!jwtSecretBrut) {
    throw new Error(
      "Variable GATEWAY_JWT_SECRET manquante ou vide : obligatoire pour l’authentification.",
    );
  }
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (!databaseUrl) {
    throw new Error(
      "Variable DATABASE_URL manquante ou vide : obligatoire pour la persistance PostgreSQL.",
    );
  }
  const exp = Number(process.env.GATEWAY_JWT_EXPIRES_SECONDS ?? "86400");
  const bcryptCost = Number(process.env.GATEWAY_BCRYPT_COST ?? "12");
  const serverServiceBaseUrl = resoudreUrlServiceBase({
    urlBrute: process.env.SERVER_SERVICE_BASE_URL,
    desactive: variableBooleenneActive(process.env.SERVER_SERVICE_DISABLED),
    valeurParDefaut: URL_SERVEUR_JEUX_LOCAL_PAR_DEFAUT,
  });
  const webServiceBaseUrl = resoudreUrlServiceBase({
    urlBrute: process.env.WEB_SERVICE_BASE_URL,
    desactive: variableBooleenneActive(process.env.WEB_SERVICE_DISABLED),
    valeurParDefaut: URL_SERVICE_WEB_LOCAL_PAR_DEFAUT,
  });

  return {
    rateLimitMax: Number.isFinite(max) && max > 0 ? max : 120,
    rateLimitWindowMs:
      Number.isFinite(fenetreMs) && fenetreMs > 0 ? fenetreMs : 60_000,
    jwtSecretBrut,
    jwtExpiresSeconds: Number.isFinite(exp) && exp > 0 ? exp : 86_400,
    bcryptCost:
      Number.isFinite(bcryptCost) && bcryptCost >= 4 && bcryptCost <= 15
        ? bcryptCost
        : 12,
    databaseUrl,
    serverServiceBaseUrl,
    webServiceBaseUrl,
  };
}
