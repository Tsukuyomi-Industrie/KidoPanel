import {
  cidrIpv4VersIntervalle,
  deduirePasserelleIpv4ParDefautDepuisCidr,
  ipv4TexteVersUint32,
  type IntervalleIpv4Uint32,
} from "@kidopanel/database";

export type ParametresReseauPontValides = {
  sousReseauCidr: string;
  passerelleIpv4: string;
};

/**
 * Vérifie qu’une IPv4 appartient au bloc CIDR indiqué.
 */
function ipv4EstDansCidr(ip: string, cidrNormalise: string): boolean {
  const intervalle = cidrIpv4VersIntervalle(cidrNormalise);
  const adr = ipv4TexteVersUint32(ip);
  if (intervalle === undefined || adr === undefined) {
    return false;
  }
  return adr >= intervalle.debut && adr <= intervalle.fin;
}

/**
 * Détermine si le CIDR est une plage RFC1918 utilisable pour un pont utilisateur.
 */
function cidrEstPlagePriveeAutorisee(intervalle: IntervalleIpv4Uint32): boolean {
  const blocs: IntervalleIpv4Uint32[] = [
    { debut: ipv4TexteVersUint32("10.0.0.0")!, fin: ipv4TexteVersUint32("10.255.255.255")! },
    {
      debut: ipv4TexteVersUint32("172.16.0.0")!,
      fin: ipv4TexteVersUint32("172.31.255.255")!,
    },
    {
      debut: ipv4TexteVersUint32("192.168.0.0")!,
      fin: ipv4TexteVersUint32("192.168.255.255")!,
    },
  ];
  return blocs.some(
    (b) => intervalle.debut >= b.debut && intervalle.fin <= b.fin,
  );
}

/**
 * Valide et normalise sous-réseau et passerelle pour la création d’un pont Docker utilisateur.
 */
export function validerParametresPontDockerUtilisateur(params: {
  sousReseauCidr: string;
  passerelleIpv4?: string;
  prefixeMin: number;
  prefixeMax: number;
}): ParametresReseauPontValides | { erreur: string } {
  const cidrBrut = params.sousReseauCidr.trim();
  const segment = cidrBrut.split("/");
  if (segment.length !== 2) {
    return { erreur: "Le sous-réseau doit être au format CIDR IPv4 (ex. 10.12.0.0/24)." };
  }
  const prefixe = Number.parseInt(segment[1], 10);
  if (!Number.isInteger(prefixe) || prefixe < params.prefixeMin || prefixe > params.prefixeMax) {
    return {
      erreur: `Le préfixe réseau doit être compris entre /${String(params.prefixeMin)} et /${String(params.prefixeMax)}.`,
    };
  }
  const intervalle = cidrIpv4VersIntervalle(cidrBrut);
  if (intervalle === undefined) {
    return { erreur: "Plage CIDR IPv4 invalide." };
  }
  if (!cidrEstPlagePriveeAutorisee(intervalle)) {
    return {
      erreur:
        "Seules les plages privées RFC1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) sont autorisées.",
    };
  }
  const passerelleCandidate =
    params.passerelleIpv4 !== undefined && params.passerelleIpv4.trim().length > 0
      ? params.passerelleIpv4.trim()
      : deduirePasserelleIpv4ParDefautDepuisCidr(cidrBrut);
  if (passerelleCandidate === undefined) {
    return { erreur: "Passerelle IPv4 invalide ou impossible à déduire du CIDR." };
  }
  if (!ipv4EstDansCidr(passerelleCandidate, cidrBrut)) {
    return { erreur: "La passerelle doit appartenir au sous-réseau indiqué." };
  }
  const adrPasserelleNum = ipv4TexteVersUint32(passerelleCandidate);
  if (adrPasserelleNum === undefined) {
    return { erreur: "Passerelle IPv4 illisible." };
  }
  if (prefixe <= 30) {
    if (adrPasserelleNum === intervalle.debut || adrPasserelleNum === intervalle.fin) {
      return {
        erreur:
          "La passerelle ne peut pas être l’adresse réseau ni l’adresse de diffusion du sous-réseau.",
      };
    }
  }
  return {
    sousReseauCidr: cidrBrut,
    passerelleIpv4: passerelleCandidate,
  };
}
