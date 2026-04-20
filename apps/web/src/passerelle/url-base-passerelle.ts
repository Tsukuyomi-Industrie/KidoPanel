import { CHEMIN_PROXY_PASSERELLE_DEV } from "../config/chemin-proxy-passerelle-dev.js";

function hoteEstLoopback(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "127.0.0.1" || h === "localhost" || h === "[::1]";
}

function urlDepuisVariableEnv(): string | null {
  const b = import.meta.env.VITE_GATEWAY_BASE_URL?.trim();
  if (!b || b.length === 0) {
    return null;
  }
  return b.replace(/\/$/, "");
}

/**
 * `http://127.0.0.1:3000` (ou localhost) inliné par Vite : depuis un onglet servi par
 * `http://IP:5173`, le navigateur envoie la requête au port 3000 de la machine du client,
 * pas du serveur — d’où « Failed to fetch » alors que la passerelle écoute sur le VPS.
 */
function envLoopbackIncompatibleAvecPage(urlAbsolue: string): boolean {
  if (globalThis.window === undefined) {
    return false;
  }
  try {
    const u = new URL(urlAbsolue);
    if (!hoteEstLoopback(u.hostname)) {
      return false;
    }
    return !hoteEstLoopback(globalThis.window.location.hostname);
  } catch {
    return false;
  }
}

/**
 * `VITE_GATEWAY_BASE_URL=http(s)://<même hôte>:3000` en dev : souvent copié-collé pour « corriger »
 * l’accès distant, alors que le pare-feu n’ouvre pas le 3000 — le proxy Vite suffit. On ignore cette
 * valeur en dev (si le proxy est autorisé) pour forcer `/__kidopanel_gateway`.
 * Une API sur un autre hôte ou un port ≠ 3000 reste prise en compte.
 */
function envDevMemeHotePortPasserelleStandard(urlAbsolue: string): boolean {
  if (globalThis.window === undefined) {
    return false;
  }
  try {
    const u = new URL(urlAbsolue);
    const pageH = globalThis.window.location.hostname;
    if (pageH === "" || u.hostname !== pageH) {
      return false;
    }
    if (u.port !== "3000") {
      return false;
    }
    const chemin = u.pathname.replace(/\/$/, "") || "/";
    return chemin === "/";
  } catch {
    return false;
  }
}

function urlPasserelleHorsEnvSurMemeHoteQueLaPage(): string {
  if (globalThis.window === undefined) {
    return "http://127.0.0.1:3000";
  }
  const h = globalThis.window.location.hostname;
  if (h === "" || hoteEstLoopback(h)) {
    return "http://127.0.0.1:3000";
  }
  const scheme = globalThis.window.location.protocol === "https:" ? "https" : "http";
  return `${scheme}://${h}:3000`;
}

/**
 * Relais Vite vers la passerelle sur le serveur de dev : **activé par défaut** en `import.meta.env.DEV`
 * (y compris depuis `http://127.0.0.1:5173`) pour que les `fetch` restent en même origine que le panel
 * et évitent les échecs « NetworkError » vers `127.0.0.1:3000` (pare-feu, passerelle arrêtée côté client, CORS).
 * Désactivation : `VITE_GATEWAY_DEV_USE_PROXY=0` pour forcer les appels directs vers le port 3000.
 */
function devPasserelleUtiliseProxyVite(): boolean {
  const v = import.meta.env.VITE_GATEWAY_DEV_USE_PROXY?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no" || v === "off") {
    return false;
  }
  if (!import.meta.env.DEV || globalThis.window === undefined) {
    return false;
  }
  return true;
}

/** Détecte une URL type passerelle locale en dev (`127.0.0.1:3000`) pour préférer le proxy Vite. */
function urlEstPasserelleLoopbackPort3000(urlAbsolue: string): boolean {
  try {
    const u = new URL(urlAbsolue);
    if (!hoteEstLoopback(u.hostname)) {
      return false;
    }
    return u.port === "3000";
  } catch {
    return false;
  }
}

/**
 * En dev sans `VITE_GATEWAY_BASE_URL` : proxy Vite par défaut (voir {@link devPasserelleUtiliseProxyVite}),
 * sinon URL directe loopback vers le port 3000.
 */
function urlPasserelleDevSansVariableExplicite(): string {
  if (globalThis.window === undefined) {
    return "http://127.0.0.1:3000";
  }
  if (devPasserelleUtiliseProxyVite()) {
    return `${globalThis.window.location.origin}${CHEMIN_PROXY_PASSERELLE_DEV}`;
  }
  return urlPasserelleHorsEnvSurMemeHoteQueLaPage();
}

/**
 * Base des appels à la passerelle.
 * En **dev** (`pnpm dev`), le proxy Vite `/__kidopanel_gateway` est utilisé par défaut pour toutes les origines,
 * afin que stop/start conteneur et les autres `fetch` ne ciblent pas directement `http://127.0.0.1:3000` depuis le navigateur.
 * En **preview / prod**, ou si `VITE_GATEWAY_DEV_USE_PROXY=0`, l’API suit `VITE_GATEWAY_BASE_URL` ou `http(s)://<hôte>:3000`.
 */
export function urlBasePasserelle(): string {
  if (globalThis.window !== undefined) {
    const h = globalThis.window.location.hostname;
    if (h !== "" && !hoteEstLoopback(h)) {
      let depuisEnvHorsLocal = urlDepuisVariableEnv();
      if (
        depuisEnvHorsLocal !== null &&
        envLoopbackIncompatibleAvecPage(depuisEnvHorsLocal)
      ) {
        depuisEnvHorsLocal = null;
      }
      if (
        import.meta.env.DEV &&
        devPasserelleUtiliseProxyVite() &&
        depuisEnvHorsLocal !== null &&
        envDevMemeHotePortPasserelleStandard(depuisEnvHorsLocal)
      ) {
        depuisEnvHorsLocal = null;
      }
      if (depuisEnvHorsLocal !== null) {
        return depuisEnvHorsLocal;
      }
      if (import.meta.env.DEV && devPasserelleUtiliseProxyVite()) {
        return `${globalThis.window.location.origin}${CHEMIN_PROXY_PASSERELLE_DEV}`;
      }
      const scheme = globalThis.window.location.protocol === "https:" ? "https" : "http";
      return `${scheme}://${h}:3000`;
    }
  }

  let depuisEnv = urlDepuisVariableEnv();
  if (depuisEnv !== null && envLoopbackIncompatibleAvecPage(depuisEnv)) {
    depuisEnv = null;
  }

  if (import.meta.env.DEV && globalThis.window !== undefined) {
    if (depuisEnv === null) {
      return urlPasserelleDevSansVariableExplicite();
    }
    if (
      devPasserelleUtiliseProxyVite() &&
      urlEstPasserelleLoopbackPort3000(depuisEnv)
    ) {
      return `${globalThis.window.location.origin}${CHEMIN_PROXY_PASSERELLE_DEV}`;
    }
    return depuisEnv;
  }

  if (depuisEnv !== null) {
    return depuisEnv;
  }

  return urlPasserelleHorsEnvSurMemeHoteQueLaPage();
}
