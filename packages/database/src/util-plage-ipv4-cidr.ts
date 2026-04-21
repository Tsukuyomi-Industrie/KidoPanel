/**
 * Conversions et calculs réseau IPv4 (CIDR, masques, intervalles) partagés entre passerelle et moteur Docker.
 */

/**
 * Conversion d’une adresse IPv4 textuelle vers entier 32 bits non signé (big-endian).
 */
export function ipv4TexteVersUint32(ip: string): number | undefined {
  const parties = ip.trim().split(".");
  if (parties.length !== 4) {
    return undefined;
  }
  let acc = 0;
  for (const p of parties) {
    const n = Number.parseInt(p, 10);
    if (!Number.isFinite(n) || n < 0 || n > 255 || p !== String(n)) {
      return undefined;
    }
    acc = (acc << 8) | n;
  }
  return acc >>> 0;
}

/**
 * Calcule le masque réseau IPv4 (/0 à /32) sous forme d’entier 32 bits.
 */
export function prefixeReseauIpv4VersMasque(prefixe: number): number | undefined {
  if (!Number.isInteger(prefixe) || prefixe < 0 || prefixe > 32) {
    return undefined;
  }
  if (prefixe === 0) {
    return 0;
  }
  return (~0 << (32 - prefixe)) >>> 0;
}

export type IntervalleIpv4Uint32 = { debut: number; fin: number };

/**
 * Dérive la première et la dernière adresse du bloc CIDR IPv4 (adresses réseau et broadcast incluses).
 */
export function cidrIpv4VersIntervalle(cidr: string): IntervalleIpv4Uint32 | undefined {
  const segment = cidr.trim().split("/");
  if (segment.length !== 2) {
    return undefined;
  }
  const [ipBrut, prefBrut] = segment;
  const ip = ipv4TexteVersUint32(ipBrut);
  const prefixe = Number.parseInt(prefBrut, 10);
  if (ip === undefined || !Number.isInteger(prefixe)) {
    return undefined;
  }
  const masque = prefixeReseauIpv4VersMasque(prefixe);
  if (masque === undefined) {
    return undefined;
  }
  const reseau = ip & masque;
  const broadcast = reseau | (~masque >>> 0);
  return { debut: reseau >>> 0, fin: broadcast >>> 0 };
}

/**
 * Indique si deux intervalles d’adresses IPv4 se chevauchent (bornes inclusives).
 */
export function intervallesIpv4Uint32Chevauchent(
  a: IntervalleIpv4Uint32,
  b: IntervalleIpv4Uint32,
): boolean {
  return a.debut <= b.fin && b.debut <= a.fin;
}

/**
 * Première adresse hôte du bloc (réseau + 1), habituelle comme passerelle par défaut sur un pont utilisateur.
 */
export function deduirePasserelleIpv4ParDefautDepuisCidr(cidr: string): string | undefined {
  const segment = cidr.trim().split("/");
  if (segment.length !== 2) {
    return undefined;
  }
  const ipReseau = ipv4TexteVersUint32(segment[0]);
  const prefixe = Number.parseInt(segment[1], 10);
  if (ipReseau === undefined || !Number.isInteger(prefixe)) {
    return undefined;
  }
  const masque = prefixeReseauIpv4VersMasque(prefixe);
  if (masque === undefined) {
    return undefined;
  }
  const baseReseau = ipReseau & masque;
  const adrPasserelle = (baseReseau + 1) >>> 0;
  const octets = [
    (adrPasserelle >>> 24) & 0xff,
    (adrPasserelle >>> 16) & 0xff,
    (adrPasserelle >>> 8) & 0xff,
    adrPasserelle & 0xff,
  ];
  return octets.join(".");
}
