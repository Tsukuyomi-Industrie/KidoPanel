#!/usr/bin/env bash
# Installe les dépendances et prépare l’environnement pour exécuter KidoPanel sur une machine
# (Node, pnpm, PostgreSQL via Docker Compose, migrations Prisma, build monorepo).
# Ne démarre pas les services applicatifs : voir les instructions affichées en fin de script.

set -euo pipefail

RACINE_DEPOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE_DEPOT"

echo_err() {
  echo "$*" >&2
}

MODE_VERIFIER_SEULEMENT=0
SANS_POSTGRES_DOCKER=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --verifier)
      MODE_VERIFIER_SEULEMENT=1
      shift
      ;;
    --sans-postgres-docker)
      SANS_POSTGRES_DOCKER=1
      shift
      ;;
    -h | --help)
      echo "Usage : $0 [options]"
      echo "  --verifier             Vérifie uniquement les prérequis (Node, Docker, pnpm)."
      echo "  --sans-postgres-docker N’exécute pas « docker compose » (PostgreSQL déjà joignable via DATABASE_URL)."
      exit 0
      ;;
    *)
      echo_err "Option inconnue : $1 (utilisez --help)"
      exit 1
      ;;
  esac
done

verifier_version_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo_err "Node.js est absent : installez Node 18.12 ou supérieur (ex. via https://nodejs.org ou votre gestionnaire de paquets)."
    return 1
  fi
  local maj
  maj="$(node -p "parseInt(process.versions.node.split('.')[0], 10)")"
  if [[ "$maj" -lt 18 ]]; then
    echo_err "Node.js $(node -v) est trop ancien : version minimale 18.12."
    return 1
  fi
  echo "Prérequis OK : Node $(node -v)"
}

verifier_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo_err "Docker CLI absent : installez Docker Engine et ajoutez l’utilisateur au groupe « docker » si besoin."
    return 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo_err "Docker ne répond pas (« docker info » échoue). Démarrez le démon et vérifiez les permissions."
    return 1
  fi
  echo "Prérequis OK : Docker joignable"
}

verifier_compose() {
  if docker compose version >/dev/null 2>&1; then
    echo "Prérequis OK : « docker compose » disponible"
    return 0
  fi
  echo_err "« docker compose » indisponible : installez Docker Compose V2 (plugin « compose »)."
  return 1
}

activer_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    echo "Prérequis OK : pnpm $(pnpm -v)"
    return 0
  fi
  if command -v corepack >/dev/null 2>&1; then
    echo "Activation de pnpm via corepack (version du dépôt)…"
    corepack enable
    corepack prepare pnpm@10.33.0 --activate
    echo "Prérequis OK : pnpm $(pnpm -v)"
    return 0
  fi
  echo_err "pnpm absent et corepack indisponible : installez Node récent ou « npm install -g pnpm »."
  return 1
}

preparer_fichier_env_racine() {
  if [[ -f "$RACINE_DEPOT/.env" ]]; then
    echo "Fichier .env à la racine déjà présent (non écrasé)."
    return 0
  fi
  if [[ ! -f "$RACINE_DEPOT/.env.example" ]]; then
    echo_err "Fichier .env.example introuvable à la racine du dépôt."
    return 1
  fi
  cp "$RACINE_DEPOT/.env.example" "$RACINE_DEPOT/.env"
  local secret
  if command -v openssl >/dev/null 2>&1; then
    secret="$(openssl rand -base64 48 | tr -d '\n')"
  else
    secret="$(head -c 48 /dev/urandom | base64 | tr -d '\n')"
  fi
  if grep -q '^GATEWAY_JWT_SECRET=' "$RACINE_DEPOT/.env"; then
    sed -i "s|^GATEWAY_JWT_SECRET=.*|GATEWAY_JWT_SECRET=${secret}|" "$RACINE_DEPOT/.env"
  else
    echo "GATEWAY_JWT_SECRET=${secret}" >>"$RACINE_DEPOT/.env"
  fi
  echo "Fichier .env créé depuis .env.example avec un GATEWAY_JWT_SECRET généré."
}

preparer_env_web() {
  local defaut="http://127.0.0.1:3000"
  if [[ -f "$RACINE_DEPOT/apps/web/.env" ]] || [[ -f "$RACINE_DEPOT/apps/web/.env.local" ]]; then
    echo "apps/web : .env ou .env.local déjà présent (non modifié)."
    return 0
  fi
  printf 'VITE_GATEWAY_BASE_URL=%s\n' "$defaut" >"$RACINE_DEPOT/apps/web/.env"
  echo "Créé apps/web/.env avec VITE_GATEWAY_BASE_URL=${defaut} (à adapter si le navigateur n’est pas sur la même machine)."
}

demarrer_postgres_et_attendre() {
  verifier_docker
  verifier_compose
  docker compose -f "$RACINE_DEPOT/docker-compose.yml" up -d
  echo "Attente de la disponibilité de PostgreSQL…"
  local tentatives=0
  while [[ $tentatives -lt 60 ]]; do
    if docker compose -f "$RACINE_DEPOT/docker-compose.yml" exec -T postgres \
      pg_isready -U kydopanel -d kydopanel >/dev/null 2>&1; then
      echo "PostgreSQL prêt."
      return 0
    fi
    tentatives=$((tentatives + 1))
    sleep 1
  done
  echo_err "PostgreSQL n’est pas devenu joignable à temps (vérifiez « docker compose logs postgres »)."
  return 1
}

charger_env_pour_prisma() {
  set -a
  # shellcheck source=/dev/null
  source "$RACINE_DEPOT/.env"
  set +a
}

if [[ "$MODE_VERIFIER_SEULEMENT" -eq 1 ]]; then
  verifier_version_node
  verifier_docker
  verifier_compose
  activer_pnpm
  echo "Toutes les vérifications demandées ont réussi."
  exit 0
fi

verifier_version_node
activer_pnpm

if [[ "$SANS_POSTGRES_DOCKER" -eq 0 ]]; then
  demarrer_postgres_et_attendre
else
  echo "Option --sans-postgres-docker : aucun conteneur PostgreSQL lancé par ce script."
  verifier_docker
fi

preparer_fichier_env_racine
preparer_env_web

if [[ ! -f "$RACINE_DEPOT/.env" ]]; then
  echo_err "Impossible de poursuivre sans fichier .env à la racine."
  exit 1
fi

echo "Installation des dépendances pnpm (monorepo)…"
pnpm install --frozen-lockfile

echo "Migrations Prisma (package @kidopanel/database)…"
charger_env_pour_prisma
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo_err "DATABASE_URL est vide dans .env : corrigez avant de relancer."
  exit 1
fi
pnpm --filter @kidopanel/database run db:migrate

echo "Build complet (turbo)…"
pnpm run build

echo ""
echo "=== Installation terminée ==="
echo "Variables chargées depuis la racine : utilisez « set -a », « source .env », « set +a » avant de lancer les services."
echo ""
echo "Terminal 1 — moteur conteneurs (accès Docker requis) :"
echo "  cd \"$RACINE_DEPOT\" && set -a && source .env && set +a && pnpm --filter container-engine start"
echo ""
echo "Terminal 2 — passerelle API :"
echo "  cd \"$RACINE_DEPOT\" && set -a && source .env && set +a && pnpm --filter gateway start"
echo ""
echo "Terminal 3 — interface web (développement) :"
echo "  cd \"$RACINE_DEPOT\" && pnpm --filter web dev"
echo ""
echo "Contrôles rapides : curl -s \"http://127.0.0.1:8787/health\" (moteur) ; curl -s \"http://127.0.0.1:3000/health\" (passerelle)."
echo ""
