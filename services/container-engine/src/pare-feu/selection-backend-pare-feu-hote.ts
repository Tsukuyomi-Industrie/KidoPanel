import { testerFirewalldActifSurHote } from "./executer-firewalld-hote.js";
import { testerUfwActifSurHote } from "./executer-pare-feu-ufw-hote.js";

/** Implémentation pare-feu prise en charge sur l’hôte Linux. */
export type BackendPareFeuHote = "firewalld" | "ufw";

let memoireBackend: BackendPareFeuHote | null | undefined;

/** Réinitialise le cache (tests uniquement). */
export function reinitialiserCacheBackendPareFeuHote(): void {
  memoireBackend = undefined;
}

/**
 * Choisit firewalld ou ufw : variable `CONTAINER_ENGINE_PAREFEU_BACKEND` (auto|firewalld|ufw|none),
 * sinon détection (firewalld actif en priorité, puis UFW actif).
 */
export async function obtenirBackendPareFeuHote(): Promise<
  BackendPareFeuHote | null
> {
  if (memoireBackend !== undefined) {
    return memoireBackend;
  }

  const brut = process.env.CONTAINER_ENGINE_PAREFEU_BACKEND?.trim().toLowerCase();
  if (brut === "none" || brut === "off" || brut === "0") {
    memoireBackend = null;
    return null;
  }
  if (brut === "firewalld") {
    memoireBackend = "firewalld";
    return memoireBackend;
  }
  if (brut === "ufw") {
    memoireBackend = "ufw";
    return memoireBackend;
  }

  if (await testerFirewalldActifSurHote()) {
    memoireBackend = "firewalld";
    return memoireBackend;
  }
  if (await testerUfwActifSurHote()) {
    memoireBackend = "ufw";
    return memoireBackend;
  }

  memoireBackend = null;
  return null;
}
