import { urlBasePasserelle } from "./passerelleClient.js";

/**
 * Indique si la page est chargée depuis la machine locale (même origine logique que loopback).
 */
function hotePageEstLocal(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

/**
 * Si la passerelle pointe vers loopback alors que le panel est ouvert depuis une autre machine,
 * retourne un texte d’avertissement ; sinon null (rien à afficher).
 */
export function texteAvertissementPasserelleLoopbackHoteDistant(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  let hotePasserelle = "";
  try {
    hotePasserelle = new URL(urlBasePasserelle()).hostname.toLowerCase();
  } catch {
    return null;
  }
  const passerelleEnLoopback = hotePageEstLocal(hotePasserelle);
  if (!passerelleEnLoopback) {
    return null;
  }
  if (hotePageEstLocal(window.location.hostname)) {
    return null;
  }
  return [
    "La passerelle est réglée sur localhost / 127.0.0.1 alors que vous ouvrez ce panel depuis une autre machine (hôte de la page :",
    `${window.location.host}).`,
    "",
    "Le navigateur contacte donc le port 3000 sur votre poste, pas sur le serveur VPS.",
    "",
    "Corrigez : dans apps/web/.env (sur la machine qui lance Vite ou qui build le front), définissez par exemple :",
    "VITE_GATEWAY_BASE_URL=http://ADRESSE_PUBLIQUE_DU_VPS:3000",
    "puis redémarrez le serveur de dev ou rebuilder, et rechargez la page.",
  ].join("\n");
}
