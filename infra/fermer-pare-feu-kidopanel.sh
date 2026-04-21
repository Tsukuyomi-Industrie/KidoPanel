#!/usr/bin/env bash
# Retire les ports TCP/UDP enregistrés (firewalld et/ou UFW selon ce qui est disponible),
# puis supprime le fichier d’état JSON.
set -euo pipefail

RACINE_DEPOT="${1:?Usage : $0 CHEMIN_RACINE_DEPOT_GIT [CHEMIN_JSON_OPTIONNEL]}"

CHEMIN_JSON="${2:-}"
if [[ -z "$CHEMIN_JSON" ]]; then
  CHEMIN_JSON="${RACINE_DEPOT}/donnees/pare-feu-hote-kidopanel.json"
fi

executer_avec_privileges() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    echo "Erreur : privileges root requis pour firewall-cmd (sudo absent)." >&2
    return 1
  fi
}

fermer_ports_enregistres() {
  local lignes
  if ! lignes="$(python3 -c "
import json
import sys
chemin = sys.argv[1]
try:
    with open(chemin, encoding=\"utf-8\") as f:
        d = json.load(f)
except Exception:
    sys.exit(0)
vu = set()
for e in d.get(\"entrees\", []) or []:
    for p in e.get(\"ports\", []) or []:
        proto = p.get(\"protocole\", \"tcp\")
        num = p.get(\"numero\")
        if isinstance(num, int) and proto in (\"tcp\", \"udp\"):
            vu.add((proto, num))
    for s in e.get(\"sorties\", []) or []:
        proto = s.get(\"protocole\", \"tcp\")
        debut = s.get(\"debutPort\")
        fin = s.get(\"finPort\")
        if isinstance(debut, int) and isinstance(fin, int) and proto in (\"tcp\", \"udp\"):
            vu.add((f\"out:{proto}\", f\"{debut}:{fin}\" if debut != fin else str(debut)))
for proto, num in sorted(vu):
    print(proto, num)
" "$CHEMIN_JSON")"; then
    echo "Impossible d’analyser le fichier JSON pare-feu." >&2
    return 1
  fi
  if [[ -z "${lignes// }" ]]; then
    echo "Aucun port listé dans ${CHEMIN_JSON}."
    rm -f "$CHEMIN_JSON"
    return 0
  fi
  while read -r proto num; do
    [[ -n "${proto:-}" && -n "${num:-}" ]] || continue
    if [[ "$proto" == out:* ]]; then
      local proto_sortie="${proto#out:}"
      echo "Retrait pare-feu sortie : ${num}/${proto_sortie}"
      if command -v ufw >/dev/null 2>&1; then
        executer_avec_privileges ufw delete allow out proto "$proto_sortie" to any port "$num" >/dev/null 2>&1 || true
      fi
      continue
    fi
    echo "Retrait pare-feu : ${num}/${proto}"
    if command -v firewall-cmd >/dev/null 2>&1 && executer_avec_privileges firewall-cmd --state >/dev/null 2>&1; then
      executer_avec_privileges firewall-cmd --permanent "--remove-port=${num}/${proto}" >/dev/null 2>&1 || true
      executer_avec_privileges firewall-cmd "--remove-port=${num}/${proto}" >/dev/null 2>&1 || true
    fi
    if command -v ufw >/dev/null 2>&1; then
      executer_avec_privileges ufw delete allow "${num}/${proto}" >/dev/null 2>&1 || true
    fi
  done <<<"$lignes"
  if command -v firewall-cmd >/dev/null 2>&1 && executer_avec_privileges firewall-cmd --state >/dev/null 2>&1; then
    executer_avec_privileges firewall-cmd --reload >/dev/null 2>&1 || true
  fi
  rm -f "$CHEMIN_JSON"
  echo "Fichier d’état pare-feu supprimé : ${CHEMIN_JSON}"
}

if [[ ! -f "$CHEMIN_JSON" ]]; then
  echo "Aucun fichier d’état pare-feu (${CHEMIN_JSON}), rien à fermer."
  exit 0
fi

fermer_ports_enregistres
