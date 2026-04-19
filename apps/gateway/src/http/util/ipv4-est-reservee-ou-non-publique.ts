/**
 * Détermine si une IPv4 littérale ne doit pas être utilisée comme adresse « publique » affichée aux joueurs.
 * Les plages RFC1918, lien local, CGNAT (100.64/10) et boucle sont exclues ; les noms DNS ne sont pas filtrés.
 */
export function estIpv4LitteraleReserveeOuNonPubliquePourHoteJeux(brut: string): boolean {
  const t = brut.trim();
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(t);
  if (m === null) {
    return false;
  }
  const a = Number.parseInt(m[1], 10);
  const b = Number.parseInt(m[2], 10);
  const c = Number.parseInt(m[3], 10);
  const d = Number.parseInt(m[4], 10);
  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b) ||
    !Number.isFinite(c) ||
    !Number.isFinite(d) ||
    a > 255 ||
    b > 255 ||
    c > 255 ||
    d > 255
  ) {
    return false;
  }
  if (a === 127) {
    return true;
  }
  if (a === 10) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }
  return false;
}
