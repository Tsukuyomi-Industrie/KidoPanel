import type { Context } from "hono";
import { estIpv4LitteraleReserveeOuNonPubliquePourHoteJeux } from "./ipv4-est-reservee-ou-non-publique.js";

const HOTES_LOOPBACK = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0:0:0:0:0:0:0:1",
]);

/**
 * Extrait le nom d’hôte (sans port) depuis une valeur `Host` ou `X-Forwarded-Host`, y compris littéraux IPv6 entre crochets.
 */
export function extraireNomHoteDepuisEnteteHost(brut: string): string {
  const t = brut.trim();
  if (t.length === 0) {
    return "";
  }
  if (t.startsWith("[")) {
    const finCrochet = t.indexOf("]");
    if (finCrochet > 1) {
      return t.slice(1, finCrochet).toLowerCase();
    }
  }
  const deuxPoints = t.indexOf(":");
  if (deuxPoints > 0 && !t.includes("]")) {
    return t.slice(0, deuxPoints).trim().toLowerCase();
  }
  return t.toLowerCase();
}

export function estNomHoteLoopbackOuLocal(nom: string): boolean {
  return HOTES_LOOPBACK.has(nom.trim().toLowerCase());
}

/**
 * Ordre : **`GATEWAY_PUBLIC_HOST_FOR_CLIENTS`** (IPv4 littérale privée ignorée pour ne pas masquer les en-têtes),
 * puis **`X-Forwarded-Host`** (proxy Vite ou reverse proxy),
 * puis **`Host`** si ce n’est pas une adresse loopback (sinon null — le navigateur utilisera son hostname).
 */
export function resoudreHotePublicConnexionJeuxDepuisRequete(c: Context): string | null {
  const depuisEnv = process.env.GATEWAY_PUBLIC_HOST_FOR_CLIENTS?.trim();
  if (
    depuisEnv !== undefined &&
    depuisEnv.length > 0 &&
    !estIpv4LitteraleReserveeOuNonPubliquePourHoteJeux(depuisEnv)
  ) {
    return depuisEnv;
  }
  const transfere = c.req.header("x-forwarded-host")?.split(",")[0];
  if (transfere !== undefined) {
    const h = extraireNomHoteDepuisEnteteHost(transfere);
    if (h.length > 0 && !estNomHoteLoopbackOuLocal(h)) {
      return h;
    }
  }
  const host = c.req.header("host");
  if (host !== undefined) {
    const h = extraireNomHoteDepuisEnteteHost(host);
    if (h.length > 0 && !estNomHoteLoopbackOuLocal(h)) {
      return h;
    }
  }
  return null;
}
