#!/usr/bin/env bash
# Installe ou met à jour KidoPanel, démarre le panel en arrière-plan (moteur, passerelle, Vite).
# Réexécution : menu (mise à jour, redémarrage, arrêt, désinstallation). Option --verifier inchangée.

set -euo pipefail

RACINE_DEPOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE_DEPOT"

DIR_RUN="${RACINE_DEPOT}/infra/run"
LOG_DIR="${RACINE_DEPOT}/infra/logs"
FICHIER_MARQUEUR="${DIR_RUN}/.panel-pret"
PID_MOTEUR="${DIR_RUN}/pid-moteur.txt"
PID_PASSERELLE="${DIR_RUN}/pid-passerelle.txt"
PID_WEB="${DIR_RUN}/pid-web.txt"

VERSION_COMPOSE_BINAIRE="v2.32.2"

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
      echo "  --verifier              Vérifie uniquement les prérequis."
      echo "  --sans-postgres-docker  N’utilise pas docker compose pour PostgreSQL."
      echo "Après la première installation, le panel démarre en arrière-plan ; journaux dans infra/logs/."
      echo "Variable : PANEL_INSTALLER_SANS_AUTO=1 désactive l’installation auto de Compose."
      echo "Variable : PANEL_INSTALLER_ACTION=mettre-a-jour|redemarrer|arreter (sans menu, pour scripts)."
      exit 0
      ;;
    *)
      echo_err "Option inconnue : $1 (utilisez --help)"
      exit 1
      ;;
  esac
done

DOCKER_COMPOSE=()

definir_commande_compose_si_disponible() {
  DOCKER_COMPOSE=()
  if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE=(docker compose)
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1 && docker-compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE=(docker-compose)
    return 0
  fi
  return 1
}

executer_avec_privileges() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    return 1
  fi
}

architecture_compose_github() {
  case "$(uname -m)" in
    x86_64 | amd64) echo "x86_64" ;;
    aarch64 | arm64) echo "aarch64" ;;
    armv7l) echo "armv7" ;;
    *) echo "" ;;
  esac
}

installer_compose_via_paquets() {
  [[ "${PANEL_INSTALLER_SANS_AUTO:-}" == "1" ]] && return 1
  echo "Tentative d’installation du plugin Docker Compose via le gestionnaire de paquets…"
  if command -v apt-get >/dev/null 2>&1; then
    if executer_avec_privileges env DEBIAN_FRONTEND=noninteractive apt-get update -qq &&
      executer_avec_privileges env DEBIAN_FRONTEND=noninteractive apt-get install -y docker-compose-plugin; then
      return 0
    fi
  fi
  command -v dnf >/dev/null 2>&1 && executer_avec_privileges dnf install -y docker-compose-plugin 2>/dev/null && return 0
  command -v yum >/dev/null 2>&1 && executer_avec_privileges yum install -y docker-compose-plugin 2>/dev/null && return 0
  command -v zypper >/dev/null 2>&1 && executer_avec_privileges zypper install -y docker-compose-plugin 2>/dev/null && return 0
  command -v apk >/dev/null 2>&1 && executer_avec_privileges apk add --no-cache docker-cli-compose 2>/dev/null && return 0
  return 1
}

installer_compose_via_binaire_officiel() {
  [[ "${PANEL_INSTALLER_SANS_AUTO:-}" == "1" ]] && return 1
  local arch url dest dir_plugin
  arch="$(architecture_compose_github)"
  [[ -z "$arch" ]] && echo_err "Architecture $(uname -m) non prise en charge pour Compose." && return 1
  url="https://github.com/docker/compose/releases/download/${VERSION_COMPOSE_BINAIRE}/docker-compose-linux-${arch}"
  echo "Téléchargement de Docker Compose ${VERSION_COMPOSE_BINAIRE} depuis GitHub…"
  if [[ "$(id -u)" -eq 0 ]]; then
    dir_plugin="/usr/local/lib/docker/cli-plugins"
    executer_avec_privileges mkdir -p "$dir_plugin"
    dest="${dir_plugin}/docker-compose"
    if command -v curl >/dev/null 2>&1; then
      curl -fsSL "$url" -o "$dest"
    elif command -v wget >/dev/null 2>&1; then
      wget -qO "$dest" "$url"
    else
      echo_err "Installez « curl » ou « wget »."
      return 1
    fi
    chmod +x "$dest"
    return 0
  fi
  dir_plugin="${HOME}/.docker/cli-plugins"
  mkdir -p "$dir_plugin"
  dest="${dir_plugin}/docker-compose"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$dest"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$dest" "$url"
  else
    echo_err "Installez « curl » ou « wget »."
    return 1
  fi
  chmod +x "$dest"
  return 0
}

assurer_docker_compose() {
  if definir_commande_compose_si_disponible; then
    echo "Prérequis OK : Compose (« ${DOCKER_COMPOSE[*]} »)"
    return 0
  fi
  [[ "${PANEL_INSTALLER_SANS_AUTO:-}" == "1" ]] && echo_err "Compose indisponible (PANEL_INSTALLER_SANS_AUTO=1)." && return 1
  echo "Compose absent : installation automatique…"
  installer_compose_via_paquets || true
  if definir_commande_compose_si_disponible; then
    echo "Prérequis OK : Compose installé via paquets."
    return 0
  fi
  if installer_compose_via_binaire_officiel && definir_commande_compose_si_disponible; then
    echo "Prérequis OK : Compose installé (binaire plugin)."
    return 0
  fi
  echo_err "Impossible d’installer Docker Compose automatiquement."
  return 1
}

verifier_version_node() {
  command -v node >/dev/null 2>&1 || {
    echo_err "Node.js absent (≥ 18.12 requis)."
    return 1
  }
  local maj
  maj="$(node -p "parseInt(process.versions.node.split('.')[0], 10)")"
  [[ "$maj" -lt 18 ]] && echo_err "Node $(node -v) trop ancien." && return 1
  echo "Prérequis OK : Node $(node -v)"
}

verifier_docker() {
  command -v docker >/dev/null 2>&1 || {
    echo_err "Docker CLI absent."
    return 1
  }
  docker info >/dev/null 2>&1 || {
    echo_err "Docker ne répond pas."
    return 1
  }
  echo "Prérequis OK : Docker joignable"
}

verifier_compose_uniquement() {
  definir_commande_compose_si_disponible || {
    echo_err "Compose indisponible."
    return 1
  }
  echo "Prérequis OK : « ${DOCKER_COMPOSE[*]} »"
}

activer_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    echo "Prérequis OK : pnpm $(pnpm -v)"
    return 0
  fi
  if command -v corepack >/dev/null 2>&1; then
    echo "Activation de pnpm via corepack…"
    corepack enable
    corepack prepare pnpm@10.33.0 --activate
    echo "Prérequis OK : pnpm $(pnpm -v)"
    return 0
  fi
  echo_err "pnpm absent : installez Node récent ou corepack."
  return 1
}

preparer_fichier_env_racine() {
  if [[ -f "$RACINE_DEPOT/.env" ]]; then
    echo "Fichier .env présent (non écrasé)."
    return 0
  fi
  [[ -f "$RACINE_DEPOT/.env.example" ]] || {
    echo_err ".env.example introuvable."
    return 1
  }
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
  echo "Fichier .env créé avec GATEWAY_JWT_SECRET généré."
}

preparer_env_web() {
  if [[ -f "$RACINE_DEPOT/apps/web/.env" ]] || [[ -f "$RACINE_DEPOT/apps/web/.env.local" ]]; then
    echo "apps/web : .env déjà présent."
    return 0
  fi
  if [[ -f "$RACINE_DEPOT/apps/web/.env.example" ]]; then
    cp "$RACINE_DEPOT/apps/web/.env.example" "$RACINE_DEPOT/apps/web/.env"
    echo "Créé apps/web/.env depuis .env.example (VITE_GATEWAY_BASE_URL commenté : en dev, même hôte que la page, port 3000)."
  else
    printf '%s\n' \
      "# Optionnel : en pnpm dev sans ligne active, le front utilise http(s)://<hôte de la page>:3000." \
      "# VITE_GATEWAY_BASE_URL=http://127.0.0.1:3000" \
      >"$RACINE_DEPOT/apps/web/.env"
    echo "Créé apps/web/.env minimal (passerelle dev = hôte de la page :3000 si variable absente)."
  fi
}

demarrer_postgres_et_attendre() {
  verifier_docker
  assurer_docker_compose
  "${DOCKER_COMPOSE[@]}" -f "$RACINE_DEPOT/docker-compose.yml" up -d
  echo "Attente PostgreSQL…"
  local t=0
  while [[ $t -lt 60 ]]; do
    if "${DOCKER_COMPOSE[@]}" -f "$RACINE_DEPOT/docker-compose.yml" exec -T postgres \
      pg_isready -U kydopanel -d kydopanel >/dev/null 2>&1; then
      echo "PostgreSQL prêt."
      return 0
    fi
    t=$((t + 1))
    sleep 1
  done
  echo_err "PostgreSQL injoignable (voir compose logs postgres)."
  return 1
}

charger_env_pour_prisma() {
  set -a
  # shellcheck source=/dev/null
  source "$RACINE_DEPOT/.env"
  set +a
}

etapes_dependances_build() {
  echo "pnpm install…"
  pnpm install --frozen-lockfile
  echo "Migrations Prisma…"
  charger_env_pour_prisma
  [[ -n "${DATABASE_URL:-}" ]] || {
    echo_err "DATABASE_URL vide dans .env."
    return 1
  }
  pnpm --filter @kidopanel/database run db:migrate
  echo "Build turbo…"
  pnpm run build
}

arreter_processus_pidfichier() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  local pid
  pid="$(cat "$f")"
  if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    sleep 1
    kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$f"
}

# Libère un port TCP si un ancien processus (hors PID enregistré) occupe encore 8787 / 3000 / 5173.
liberer_port_tcp() {
  local port="$1"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
    return 0
  fi
  if command -v lsof >/dev/null 2>&1; then
    local p
    for p in $(lsof -t -iTCP:"${port}" -sTCP:LISTEN 2>/dev/null); do
      kill -9 "$p" 2>/dev/null || true
    done
  fi
}

# Arrêt des PIDs enregistrés puis libération des ports (évite EADDRINUSE si un vieux node écoute encore).
reinitialiser_processus_panel() {
  mkdir -p "$DIR_RUN"
  arreter_processus_pidfichier "$PID_WEB"
  arreter_processus_pidfichier "$PID_PASSERELLE"
  arreter_processus_pidfichier "$PID_MOTEUR"
  sleep 1
  liberer_port_tcp 5175
  liberer_port_tcp 5174
  liberer_port_tcp 5173
  liberer_port_tcp 3000
  liberer_port_tcp 8787
  sleep 1
}

arreter_panel() {
  echo "Arrêt des processus du panel (si actifs)…"
  reinitialiser_processus_panel
}

demarrer_panel() {
  mkdir -p "$DIR_RUN" "$LOG_DIR"
  cd "$RACINE_DEPOT"
  echo "Préparation : arrêt des anciens processus et libération des ports 5173–5175, 3000, 8787…"
  reinitialiser_processus_panel
  echo "Démarrage du panel en arrière-plan (journaux : ${LOG_DIR}/)…"

  nohup bash -c "cd \"$RACINE_DEPOT\" && set -a && source .env && set +a && exec pnpm --filter container-engine start" \
    >>"${LOG_DIR}/moteur.log" 2>&1 &
  echo $! >"$PID_MOTEUR"

  nohup bash -c "cd \"$RACINE_DEPOT\" && set -a && source .env && set +a && exec pnpm --filter gateway start" \
    >>"${LOG_DIR}/passerelle.log" 2>&1 &
  echo $! >"$PID_PASSERELLE"

  nohup bash -c "cd \"$RACINE_DEPOT\" && exec pnpm --filter web run dev" \
    >>"${LOG_DIR}/web.log" 2>&1 &
  echo $! >"$PID_WEB"

  sleep 3
  echo "Processus lancés : moteur PID $(cat "$PID_MOTEUR"), passerelle $(cat "$PID_PASSERELLE"), web $(cat "$PID_WEB")."
}

afficher_acces_panel() {
  echo ""
  echo "=== Panel démarré ==="
  echo "Interface : http://127.0.0.1:5173 (ou http://IP_DU_SERVEUR:5173 — Vite écoute sur 0.0.0.0)"
  echo "Passerelle : http://127.0.0.1:3000"
  echo "Journaux : tail -f \"${LOG_DIR}/moteur.log\" … passerelle.log … web.log"
  echo "Arrêt / mise à jour : relancez ce script pour le menu."
  echo ""
}

panel_marque_comme_pret() {
  mkdir -p "$DIR_RUN"
  touch "$FICHIER_MARQUEUR"
}

installation_premiere_fois() {
  verifier_version_node
  activer_pnpm
  if [[ "$SANS_POSTGRES_DOCKER" -eq 0 ]]; then
    demarrer_postgres_et_attendre
  else
    echo "Sans postgres docker : vérifiez DATABASE_URL."
    verifier_docker
  fi
  preparer_fichier_env_racine
  preparer_env_web
  [[ -f "$RACINE_DEPOT/.env" ]] || exit 1
  etapes_dependances_build
  panel_marque_comme_pret
  demarrer_panel
  afficher_acces_panel
}

mettre_a_jour_et_redemarrer() {
  verifier_version_node
  activer_pnpm
  [[ "$SANS_POSTGRES_DOCKER" -eq 0 ]] && demarrer_postgres_et_attendre || verifier_docker
  [[ -f "$RACINE_DEPOT/.env" ]] || {
    echo_err ".env manquant."
    return 1
  }
  arreter_panel
  etapes_dependances_build
  demarrer_panel
  afficher_acces_panel
}

redemarrer_seulement() {
  verifier_version_node
  activer_pnpm
  [[ -f "$RACINE_DEPOT/.env" ]] || {
    echo_err ".env manquant."
    return 1
  }
  [[ "$SANS_POSTGRES_DOCKER" -eq 0 ]] && demarrer_postgres_et_attendre || true
  arreter_panel
  demarrer_panel
  afficher_acces_panel
}

menu_desinstaller() {
  echo ""
  echo "Désinstallation : arrêt des services, puis options destructives."
  read -r -p "Confirmer l’arrêt immédiat du panel ? [o/N] " c1
  [[ "$c1" == "o" || "$c1" == "O" ]] || {
    echo "Annulé."
    return 0
  }
  arreter_panel
  read -r -p "Supprimer node_modules à la racine du dépôt ? [o/N] " c2
  if [[ "$c2" == "o" || "$c2" == "O" ]]; then
    rm -rf "${RACINE_DEPOT}/node_modules"
    echo "node_modules racine supprimé."
  fi
  read -r -p "Supprimer le fichier .env à la racine ? [o/N] " c3
  if [[ "$c3" == "o" || "$c3" == "O" ]]; then
    rm -f "${RACINE_DEPOT}/.env"
    echo ".env supprimé."
  fi
  read -r -p "Exécuter « docker compose down » (arrêt Postgres du compose) ? [o/N] " c4
  if [[ "$c4" == "o" || "$c4" == "O" ]]; then
    if definir_commande_compose_si_disponible; then
      "${DOCKER_COMPOSE[@]}" -f "$RACINE_DEPOT/docker-compose.yml" down
      echo "Compose arrêté."
    else
      echo_err "Compose indisponible : arrêt manuel du stack si besoin."
    fi
  fi
  read -r -p "Supprimer aussi le volume Postgres (docker compose down -v) ? [o/N] " c5
  if [[ "$c5" == "o" || "$c5" == "O" ]]; then
    if definir_commande_compose_si_disponible; then
      "${DOCKER_COMPOSE[@]}" -f "$RACINE_DEPOT/docker-compose.yml" down -v
      echo "Volumes compose supprimés."
    fi
  fi
  rm -f "$FICHIER_MARQUEUR"
  echo "Marqueur d’installation retiré : une prochaine exécution refait une installation initiale."
}

menu_reexecution() {
  local action="${PANEL_INSTALLER_ACTION:-}"
  if [[ -n "$action" ]]; then
    case "$action" in
      mettre-a-jour) mettre_a_jour_et_redemarrer ;;
      redemarrer) redemarrer_seulement ;;
      arreter) arreter_panel && echo "Panel arrêté." ;;
      *) echo_err "PANEL_INSTALLER_ACTION inconnu : $action" && exit 1 ;;
    esac
    return 0
  fi
  echo ""
  echo "KidoPanel est déjà installé dans ce dépôt."
  echo "  1) Mettre à jour (pnpm, migrations, build) et redémarrer le panel"
  echo "  2) Redémarrer le panel uniquement (sans rebuild)"
  echo "  3) Arrêter le panel (processus en arrière-plan)"
  echo "  4) Désinstaller (choix interactifs : fichiers, compose…)"
  echo "  0) Quitter"
  read -r -p "Choix [0-4] : " choix
  case "$choix" in
    1) mettre_a_jour_et_redemarrer ;;
    2) redemarrer_seulement ;;
    3) arreter_panel && echo "Panel arrêté." ;;
    4) menu_desinstaller ;;
    0) echo "Au revoir." ;;
    *) echo_err "Choix invalide." && exit 1 ;;
  esac
}

# --- Point d’entrée ---

if [[ "$MODE_VERIFIER_SEULEMENT" -eq 1 ]]; then
  verifier_version_node
  verifier_docker
  verifier_compose_uniquement
  activer_pnpm
  echo "Vérifications OK."
  exit 0
fi

if [[ -f "$FICHIER_MARQUEUR" ]]; then
  if [[ -t 0 ]] || [[ -n "${PANEL_INSTALLER_ACTION:-}" ]]; then
    menu_reexecution
  else
    echo_err "Entrée non interactive et panel déjà marqué installé."
    echo_err "Utilisez PANEL_INSTALLER_ACTION=mettre-a-jour|redemarrer|arreter ou lancez dans un terminal."
    exit 1
  fi
  exit 0
fi

installation_premiere_fois
