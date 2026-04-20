#!/usr/bin/env bash
# Installe ou met à jour KidoPanel, démarre le panel en arrière-plan (moteur, passerelle, Vite).
# Hors --verifier : peut installer curl, nvm + Node cible, sinon Node par paquets ou archive ; Docker Engine et Compose v2 si absents.
# Réexécution : menu (mise à jour, redémarrage, arrêt, désinstallation).

set -euo pipefail

RACINE_DEPOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE_DEPOT"

DIR_RUN="${RACINE_DEPOT}/infra/run"
LOG_DIR="${RACINE_DEPOT}/infra/logs"
FICHIER_MARQUEUR="${DIR_RUN}/.panel-pret"
PID_MOTEUR="${DIR_RUN}/pid-moteur.txt"
PID_SERVER_JEUX="${DIR_RUN}/pid-server-jeux.txt"
PID_SERVICE_WEB_METIER="${DIR_RUN}/pid-service-web-metier.txt"
PID_PASSERELLE="${DIR_RUN}/pid-passerelle.txt"
PID_WEB="${DIR_RUN}/pid-web.txt"

VERSION_COMPOSE_BINAIRE="v2.32.2"
# Aligné sur pnpm 10 (Node ≥ 18.12) et les `engines` du monorepo.
VERSION_NODE_MINIMUM="18.12.0"
# Archive officielle installée si les paquets ne fournissent pas une version suffisante.
VERSION_NODE_INSTALLER_BINAIRE="20.20.2"
# Référence du dépôt nvm-sh/nvm (script d’installation curl).
NVM_VERSION_REF_INSTALL="v0.40.1"
CHEMIN_ENV_NODE_PANEL="${DIR_RUN}/env-chemin-node.sh"
CHEMIN_COMPOSE_POSTGRES="${RACINE_DEPOT}/docker-compose.yml"
# Doit rester aligné sur `container_name` du service postgres dans docker-compose.yml.
NOM_CONTENEUR_POSTGRES_PANEL="kydopanel-postgres"

echo_err() {
  echo "$*" >&2
  return 0
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
      echo "  --verifier              Vérifie uniquement les prérequis (aucune installation)."
      echo "  --sans-postgres-docker  N’utilise pas docker compose pour PostgreSQL."
      echo "Après la première installation, le panel démarre en arrière-plan ; journaux dans infra/logs/."
      echo "Sans --verifier : installe si besoin curl, nvm + Node cible (≥ ${VERSION_NODE_MINIMUM}), sinon paquets ou archive ; Docker Engine et Compose v2."
      echo "Variable : PANEL_INSTALLER_SANS_AUTO=1 désactive toute installation automatique (Compose, Node, Docker, curl)."
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

# Indique si la sous-commande « docker compose » est le plugin officiel en branche majeure 2+.
compose_plugin_docker_est_version_majeure_2() {
  command -v docker >/dev/null 2>&1 || return 1
  docker compose version >/dev/null 2>&1 || return 1
  local court maj
  court="$(docker compose version --short 2>/dev/null || echo "")"
  court="${court#v}"
  if [[ -n "$court" ]]; then
    maj="${court%%.*}"
    [[ "$maj" =~ ^[0-9]+$ ]] && [[ "$maj" -ge 2 ]] && return 0
  fi
  docker compose version 2>/dev/null | grep -qiE 'compose[[:space:]]+version[[:space:]]+v2|Docker Compose version[[:space:]]+v2'
}

definir_commande_compose_si_disponible() {
  DOCKER_COMPOSE=()
  if compose_plugin_docker_est_version_majeure_2; then
    DOCKER_COMPOSE=(docker compose)
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

# Charge le PATH Node du panel : fichier généré par nvm ou par l’archive officielle Node.
charger_chemin_node_si_present() {
  [[ -f "$CHEMIN_ENV_NODE_PANEL" ]] || return 0
  # shellcheck source=/dev/null
  source "$CHEMIN_ENV_NODE_PANEL"
}

# Compare la version courante de Node à VERSION_NODE_MINIMUM (tri sémantique).
node_version_repond_au_minimum() {
  command -v node >/dev/null 2>&1 || return 1
  local cur min first
  cur="$(node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1-3)"
  min="$VERSION_NODE_MINIMUM"
  [[ -z "$cur" ]] && return 1
  first="$(printf '%s\n%s\n' "$min" "$cur" | sort -V | head -n1)"
  [[ "$first" == "$min" ]]
}

# Charge nvm dans le shell courant (répertoire utilisateur standard).
charger_nvm_dans_shell() {
  export NVM_DIR="${HOME}/.nvm"
  [[ -s "$NVM_DIR/nvm.sh" ]] || return 1
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
}

# Installe nvm sous ~/.nvm si le script d’accrochage est absent.
installer_nvm_si_absent() {
  [[ "${PANEL_INSTALLER_SANS_AUTO:-}" == "1" ]] && return 1
  [[ -s "${HOME}/.nvm/nvm.sh" ]] && return 0
  assurer_curl_ou_wget || return 1
  echo "Installation de nvm (${NVM_VERSION_REF_INSTALL}) dans \${HOME}/.nvm …"
  local script_tmp
  script_tmp="/tmp/nvm-install-kidopanel-$$.sh"
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION_REF_INSTALL}/install.sh" -o "$script_tmp" || {
    rm -f "$script_tmp"
    return 1
  }
  NVM_DIR="${HOME}/.nvm" bash "$script_tmp" || {
    rm -f "$script_tmp"
    return 1
  }
  rm -f "$script_tmp"
  [[ -s "${HOME}/.nvm/nvm.sh" ]] || return 1
}

# Écrit le fichier sourcé par l’installeur pour activer la version Node gérée par nvm.
ecrire_env_panel_pour_nvm() {
  mkdir -p "$DIR_RUN"
  {
    printf '%s\n' 'export NVM_DIR="${HOME}/.nvm"'
    printf '%s\n' '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"'
    printf '%s\n' "nvm use ${VERSION_NODE_INSTALLER_BINAIRE} >/dev/null 2>&1"
  } >"$CHEMIN_ENV_NODE_PANEL"
  return 0
}

# Installe ou réutilise nvm puis la version Node VERSION_NODE_INSTALLER_BINAIRE (sans droits root).
installer_nodejs_via_nvm() {
  [[ "${PANEL_INSTALLER_SANS_AUTO:-}" == "1" ]] && return 1
  installer_nvm_si_absent || return 1
  charger_nvm_dans_shell || return 1
  echo "Installation de Node.js ${VERSION_NODE_INSTALLER_BINAIRE} via nvm…"
  nvm install "${VERSION_NODE_INSTALLER_BINAIRE}" || return 1
  nvm alias default "${VERSION_NODE_INSTALLER_BINAIRE}" 2>/dev/null || true
  ecrire_env_panel_pour_nvm
  hash -r 2>/dev/null || true
  charger_chemin_node_si_present
  node_version_repond_au_minimum
}

# Installe curl ou wget si aucun n’est disponible (téléchargements Node / Compose / Docker).
assurer_curl_ou_wget() {
  command -v curl >/dev/null 2>&1 && return 0
  command -v wget >/dev/null 2>&1 && return 0
  [[ "${PANEL_INSTALLER_SANS_AUTO:-}" == "1" ]] && echo_err "curl ou wget requis (PANEL_INSTALLER_SANS_AUTO=1)." && return 1
  echo "Installation de « curl » (téléchargements)…"
  if command -v apt-get >/dev/null 2>&1; then
    executer_avec_privileges env DEBIAN_FRONTEND=noninteractive apt-get update -qq &&
      executer_avec_privileges env DEBIAN_FRONTEND=noninteractive apt-get install -y curl && return 0
  fi
  command -v dnf >/dev/null 2>&1 && executer_avec_privileges dnf install -y curl && return 0
  command -v yum >/dev/null 2>&1 && executer_avec_privileges yum install -y curl && return 0
  command -v zypper >/dev/null 2>&1 && executer_avec_privileges zypper install -y curl && return 0
  command -v apk >/dev/null 2>&1 && executer_avec_privileges apk add --no-cache curl && return 0
  echo_err "Installez « curl » ou « wget » manuellement."
  return 1
}

# Démarre ou active le service systemd du démon Docker après installation paquet.
demarrer_service_docker_si_possible() {
  if command -v systemctl >/dev/null 2>&1; then
    executer_avec_privileges systemctl enable docker 2>/dev/null || true
    executer_avec_privileges systemctl start docker 2>/dev/null || true
  fi
  return 0
}

# Installe Docker Engine et le plugin Compose v2 via les dépôts (priorité Debian et Fedora).
installer_paquetage_docker_moteur() {
  [[ "${PANEL_INSTALLER_SANS_AUTO:-}" == "1" ]] && return 1
  if command -v apt-get >/dev/null 2>&1; then
    echo "Debian/Ubuntu : installation de Docker (docker.io) et du plugin Docker Compose v2…"
    executer_avec_privileges env DEBIAN_FRONTEND=noninteractive apt-get update -qq || return 1
    executer_avec_privileges env DEBIAN_FRONTEND=noninteractive apt-get install -y \
      ca-certificates curl gnupg 2>/dev/null || true
    if executer_avec_privileges env DEBIAN_FRONTEND=noninteractive apt-get install -y \
      docker-compose-plugin docker.io; then
      demarrer_service_docker_si_possible
      command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && return 0
    fi
    echo "Nouvel essai : plugin Compose seul si le moteur est déjà présent…"
    executer_avec_privileges env DEBIAN_FRONTEND=noninteractive apt-get install -y docker-compose-plugin 2>/dev/null || true
    demarrer_service_docker_si_possible
    command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && return 0
    return 1
  fi
  if command -v dnf >/dev/null 2>&1; then
    echo "Fedora / Nobara : installation du paquet « docker » et du plugin « docker-compose-plugin » (Compose v2)…"
    if executer_avec_privileges dnf install -y docker docker-compose-plugin; then
      demarrer_service_docker_si_possible
      command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && return 0
    fi
    echo "Fedora : nouvel essai avec le plugin Compose seul…"
    executer_avec_privileges dnf install -y docker-compose-plugin 2>/dev/null || true
    demarrer_service_docker_si_possible
    command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && return 0
    return 1
  fi
  if command -v yum >/dev/null 2>&1; then
    echo "Tentative d’installation de Docker (yum)…"
    executer_avec_privileges yum install -y docker docker-compose-plugin 2>/dev/null &&
      demarrer_service_docker_si_possible &&
      command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && return 0
    return 1
  fi
  if command -v zypper >/dev/null 2>&1; then
    executer_avec_privileges zypper install -y docker docker-compose-plugin 2>/dev/null &&
      demarrer_service_docker_si_possible &&
      command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && return 0
    return 1
  fi
  if command -v apk >/dev/null 2>&1; then
    executer_avec_privileges apk add --no-cache docker docker-cli-compose 2>/dev/null &&
      demarrer_service_docker_si_possible &&
      command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && return 0
    return 1
  fi
  return 1
}

# Installe Docker Engine via le script officiel get.docker.com (nécessite curl et privilèges).
installer_docker_moteur_script_officiel() {
  [[ "${PANEL_INSTALLER_SANS_AUTO:-}" == "1" ]] && return 1
  assurer_curl_ou_wget || return 1
  echo "Tentative d’installation de Docker via https://get.docker.com …"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | executer_avec_privileges sh
  else
    wget -qO- https://get.docker.com | executer_avec_privileges sh
  fi
  demarrer_service_docker_si_possible
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

# Garantit un Docker Engine joignable (installation paquets ou script officiel si absent).
assurer_docker_moteur() {
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo "Prérequis OK : Docker Engine joignable."
    return 0
  fi
  if command -v docker >/dev/null 2>&1; then
    echo_err "La commande « docker » existe mais « docker info » échoue (démon arrêté ou droits : groupe « docker », root)."
    return 1
  fi
  [[ "${PANEL_INSTALLER_SANS_AUTO:-}" == "1" ]] && echo_err "Docker requis ; installation auto désactivée (PANEL_INSTALLER_SANS_AUTO=1)." && return 1
  echo "Docker Engine absent : tentative d’installation automatique…"
  installer_paquetage_docker_moteur || installer_docker_moteur_script_officiel || {
    echo_err "Impossible d’installer Docker automatiquement sur cette distribution."
    return 1
  }
  if ! docker info >/dev/null 2>&1; then
    echo_err "Après installation, « docker info » échoue encore. Démarrez le service (ex. systemctl start docker) et vérifiez les droits."
    return 1
  fi
  echo "Prérequis OK : Docker Engine installé et joignable."
}

# Installe Node.js ≥ VERSION_NODE_MINIMUM via le dépôt NodeSource (Debian / Ubuntu).
installer_nodejs_nodesource_deb() {
  [[ "${PANEL_INSTALLER_SANS_AUTO:-}" == "1" ]] && return 1
  command -v apt-get >/dev/null 2>&1 || return 1
  assurer_curl_ou_wget || return 1
  echo "Installation de Node.js 20.x via NodeSource (Debian/Ubuntu)…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | executer_avec_privileges bash - || return 1
  executer_avec_privileges env DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs || return 1
  return 0
}

# Installe Node.js via paquets dnf/yum si la version fournie est suffisante.
installer_nodejs_paquets_rpm() {
  [[ "${PANEL_INSTALLER_SANS_AUTO:-}" == "1" ]] && return 1
  if command -v dnf >/dev/null 2>&1; then
    executer_avec_privileges dnf install -y nodejs npm && return 0
    return 1
  fi
  if command -v yum >/dev/null 2>&1; then
    executer_avec_privileges yum install -y nodejs npm && return 0
    return 1
  fi
  return 1
}

# Installe Node VERSION_NODE_INSTALLER_BINAIRE depuis nodejs.org (système : /usr/local) ou dans le home si sans sudo.
installer_nodejs_archive_officielle() {
  [[ "${PANEL_INSTALLER_SANS_AUTO:-}" == "1" ]] && return 1
  assurer_curl_ou_wget || return 1
  local arch dossier url archive rep_bin
  case "$(uname -m)" in
    x86_64 | amd64) arch="x64" ;;
    aarch64 | arm64) arch="arm64" ;;
    *)
      echo_err "Architecture $(uname -m) non prise en charge pour le binaire Node."
      return 1
      ;;
  esac
  dossier="node-v${VERSION_NODE_INSTALLER_BINAIRE}-linux-${arch}"
  url="https://nodejs.org/dist/v${VERSION_NODE_INSTALLER_BINAIRE}/${dossier}.tar.xz"
  archive="/tmp/${dossier}.tar.xz"
  echo "Téléchargement de Node ${VERSION_NODE_INSTALLER_BINAIRE} depuis nodejs.org…"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$archive"
  else
    wget -qO "$archive" "$url"
  fi
  if [[ "$(id -u)" -eq 0 ]] || command -v sudo >/dev/null 2>&1; then
    echo "Extraction vers /usr/local …"
    executer_avec_privileges tar -xJf "$archive" --strip-components=1 -C /usr/local
    rm -f "$archive"
    rm -f "$CHEMIN_ENV_NODE_PANEL"
    hash -r 2>/dev/null || true
    return 0
  fi
  rep_bin="${HOME}/.kidopanel/${dossier}"
  mkdir -p "$rep_bin"
  tar -xJf "$archive" --strip-components=1 -C "$rep_bin"
  rm -f "$archive"
  mkdir -p "$DIR_RUN"
  printf 'export PATH="%s/bin:${PATH}"\n' "$rep_bin" >"$CHEMIN_ENV_NODE_PANEL"
  # shellcheck source=/dev/null
  source "$CHEMIN_ENV_NODE_PANEL"
  hash -r 2>/dev/null || true
  echo "Node installé dans ${rep_bin} ; PATH enregistré dans ${CHEMIN_ENV_NODE_PANEL}."
}

# Garantit Node.js ≥ VERSION_NODE_MINIMUM et corepack utilisables pour pnpm.
assurer_nodejs() {
  charger_chemin_node_si_present
  if node_version_repond_au_minimum; then
    echo "Prérequis OK : Node $(node -v)"
    return 0
  fi
  [[ "${PANEL_INSTALLER_SANS_AUTO:-}" == "1" ]] && echo_err "Node.js ≥ ${VERSION_NODE_MINIMUM} requis (PANEL_INSTALLER_SANS_AUTO=1)." && return 1
  echo "Node.js absent ou version < ${VERSION_NODE_MINIMUM} : installation automatique (nvm en priorité)…"
  assurer_curl_ou_wget || return 1
  if installer_nodejs_via_nvm; then
    echo "Prérequis OK : Node $(node -v) (nvm, ${VERSION_NODE_INSTALLER_BINAIRE})"
    return 0
  fi
  echo "nvm indisponible ou version cible non installable : autres méthodes (paquets, archive)…"
  if installer_nodejs_nodesource_deb; then
    hash -r 2>/dev/null || true
    charger_chemin_node_si_present
    node_version_repond_au_minimum && {
      echo "Prérequis OK : Node $(node -v)"
      return 0
    }
  fi
  if installer_nodejs_paquets_rpm; then
    hash -r 2>/dev/null || true
    charger_chemin_node_si_present
    node_version_repond_au_minimum && {
      echo "Prérequis OK : Node $(node -v)"
      return 0
    }
  fi
  installer_nodejs_archive_officielle || return 1
  charger_chemin_node_si_present
  node_version_repond_au_minimum || {
    echo_err "Node installé mais la version reste insuffisante."
    return 1
  }
  echo "Prérequis OK : Node $(node -v)"
}

architecture_compose_github() {
  case "$(uname -m)" in
    x86_64 | amd64) echo "x86_64" ;;
    aarch64 | arm64) echo "aarch64" ;;
    armv7l) echo "armv7" ;;
    *) echo "" ;;
  esac
  return 0
}

installer_compose_via_paquets() {
  [[ "${PANEL_INSTALLER_SANS_AUTO:-}" == "1" ]] && return 1
  echo "Tentative d’installation du plugin Docker Compose v2 via le gestionnaire de paquets…"
  if command -v apt-get >/dev/null 2>&1 &&
    executer_avec_privileges env DEBIAN_FRONTEND=noninteractive apt-get update -qq &&
    executer_avec_privileges env DEBIAN_FRONTEND=noninteractive apt-get install -y docker-compose-plugin; then
    compose_plugin_docker_est_version_majeure_2 && return 0
  fi
  if command -v dnf >/dev/null 2>&1; then
    executer_avec_privileges dnf install -y docker-compose-plugin 2>/dev/null &&
      compose_plugin_docker_est_version_majeure_2 && return 0
  fi
  command -v yum >/dev/null 2>&1 && executer_avec_privileges yum install -y docker-compose-plugin 2>/dev/null &&
    compose_plugin_docker_est_version_majeure_2 && return 0
  command -v zypper >/dev/null 2>&1 && executer_avec_privileges zypper install -y docker-compose-plugin 2>/dev/null &&
    compose_plugin_docker_est_version_majeure_2 && return 0
  command -v apk >/dev/null 2>&1 && executer_avec_privileges apk add --no-cache docker-cli-compose 2>/dev/null &&
    compose_plugin_docker_est_version_majeure_2 && return 0
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
    echo "Prérequis OK : Docker Compose v2 (« ${DOCKER_COMPOSE[*]} », $(docker compose version --short 2>/dev/null || docker compose version 2>/dev/null | head -n1 || echo 'version inconnue'))"
    return 0
  fi
  [[ "${PANEL_INSTALLER_SANS_AUTO:-}" == "1" ]] && echo_err "Docker Compose v2 (plugin « docker compose ») requis (PANEL_INSTALLER_SANS_AUTO=1)." && return 1
  echo "Plugin Compose v2 absent : installation automatique (paquets Debian/Fedora ou binaire officiel)…"
  installer_compose_via_paquets || true
  if definir_commande_compose_si_disponible; then
    echo "Prérequis OK : Docker Compose v2 installé via paquets."
    return 0
  fi
  if installer_compose_via_binaire_officiel && definir_commande_compose_si_disponible; then
    echo "Prérequis OK : Docker Compose v2 installé (plugin dans cli-plugins)."
    return 0
  fi
  echo_err "Impossible d’installer Docker Compose v2 (« docker compose »). L’ancien « docker-compose » 1.x n’est pas pris en charge."
  return 1
}

verifier_version_node() {
  charger_chemin_node_si_present
  node_version_repond_au_minimum || {
    echo_err "Node.js absent ou version < ${VERSION_NODE_MINIMUM} (requis pour pnpm et le monorepo)."
    return 1
  }
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
    echo_err "Docker Compose v2 (commande « docker compose ») indisponible."
    return 1
  }
  echo "Prérequis OK : Docker Compose v2 (« ${DOCKER_COMPOSE[*]} »)"
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

# Valeur factice du dépôt : doit être remplacée par un secret aléatoire pour que la passerelle démarre.
PLACEHOLDER_GATEWAY_JWT_SECRET="remplacer-par-une-chaine-longue-et-aleatoire"
# Aligné sur docker-compose.yml : le mot de passe provient de POSTGRES_PASSWORD dans le fichier .env racine (aucun littéral dans ce script).
KIDOPANEL_POSTGRES_IDENTIFIANTS_GENERES=0
MOTIF_VARIABLE_POSTGRES_USER_ENV='^POSTGRES_USER='
VALEUR_EXEMPLE_POSTGRES_USER="kp_utilisateur"
VALEUR_EXEMPLE_POSTGRES_PASSWORD="remplacer-par-un-mot-de-passe-fort"

generer_secret_jwt_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -d '\n'
  else
    head -c 48 /dev/urandom | base64 | tr -d '\n'
  fi
  return 0
}

# Réécrit GATEWAY_JWT_SECRET sans passer par sed (car base64 peut contenir des caractères réservés pour sed).
ecrire_ligne_gateway_jwt_secret_env() {
  local secret="$1"
  local tmp
  tmp="$(mktemp)"
  grep -v '^GATEWAY_JWT_SECRET=' "$RACINE_DEPOT/.env" >"$tmp"
  mv "$tmp" "$RACINE_DEPOT/.env"
  printf '%s\n' "GATEWAY_JWT_SECRET=${secret}" >>"$RACINE_DEPOT/.env"
  return 0
}

# Réécrit une variable clé=valeur dans .env sans dépendre de sed.
ecrire_ligne_variable_env_racine() {
  local cle="$1"
  local valeur="$2"
  local tmp
  tmp="$(mktemp)"
  grep -v "^${cle}=" "$RACINE_DEPOT/.env" >"$tmp"
  mv "$tmp" "$RACINE_DEPOT/.env"
  printf '%s\n' "${cle}=${valeur}" >>"$RACINE_DEPOT/.env"
  return 0
}

# Génère un identifiant PostgreSQL compatible (lettres/chiffres, préfixe explicite).
generer_utilisateur_postgres_aleatoire() {
  local suffixe
  suffixe="$(tr -dc 'a-z0-9' </dev/urandom | head -c 10)"
  printf 'kp_%s' "$suffixe"
  return 0
}

# Génère un mot de passe robuste sans caractères spéciaux qui casseraient DATABASE_URL.
generer_mot_de_passe_postgres_aleatoire() {
  tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32
  return 0
}

# Garantit des identifiants PostgreSQL non vides ; les génère automatiquement si manquants.
assurer_identifiants_postgres_env_racine() {
  local utilisateur_postgres mot_de_passe
  [[ "$SANS_POSTGRES_DOCKER" -eq 0 ]] || return 0
  utilisateur_postgres="$(grep "$MOTIF_VARIABLE_POSTGRES_USER_ENV" "$RACINE_DEPOT/.env" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '\r' || true)"
  mot_de_passe="$(grep '^POSTGRES_PASSWORD=' "$RACINE_DEPOT/.env" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '\r' || true)"
  if [[ -z "${utilisateur_postgres// /}" ]] || [[ "$utilisateur_postgres" == "$VALEUR_EXEMPLE_POSTGRES_USER" ]]; then
    utilisateur_postgres="$(generer_utilisateur_postgres_aleatoire)"
    ecrire_ligne_variable_env_racine "POSTGRES_USER" "$utilisateur_postgres"
    echo "POSTGRES_USER généré automatiquement."
    KIDOPANEL_POSTGRES_IDENTIFIANTS_GENERES=1
  fi
  if [[ -z "${mot_de_passe// /}" ]] || [[ "$mot_de_passe" == "$VALEUR_EXEMPLE_POSTGRES_PASSWORD" ]]; then
    mot_de_passe="$(generer_mot_de_passe_postgres_aleatoire)"
    ecrire_ligne_variable_env_racine "POSTGRES_PASSWORD" "$mot_de_passe"
    echo "POSTGRES_PASSWORD généré automatiquement."
    KIDOPANEL_POSTGRES_IDENTIFIANTS_GENERES=1
  fi
  return 0
}

# Garantit un jeton JWT fort si la ligne est absente, vide ou encore au placeholder du dépôt.
assurer_gateway_jwt_secret_env_racine() {
  local secret actuel besoin
  besoin=1
  if grep -q '^GATEWAY_JWT_SECRET=' "$RACINE_DEPOT/.env"; then
    actuel="$(grep '^GATEWAY_JWT_SECRET=' "$RACINE_DEPOT/.env" | head -n1 | cut -d= -f2- | tr -d '\r')"
    if [[ -n "${actuel// /}" ]] && [[ "$actuel" != "$PLACEHOLDER_GATEWAY_JWT_SECRET" ]]; then
      besoin=0
    fi
  fi
  [[ "$besoin" -eq 1 ]] || return 0
  secret="$(generer_secret_jwt_hex)"
  ecrire_ligne_gateway_jwt_secret_env "$secret"
  echo "GATEWAY_JWT_SECRET défini (secret aléatoire ou remplacement du placeholder)."
}

# En mode PostgreSQL via docker-compose : impose DATABASE_URL si absent ou vide (sinon migrations Prisma échouent).
assurer_database_url_si_postgres_docker() {
  local val tmp mot_de_passe utilisateur_postgres database_url_defaut
  [[ "$SANS_POSTGRES_DOCKER" -eq 0 ]] || return 0
  mot_de_passe=""
  utilisateur_postgres=""
  if [[ -f "$RACINE_DEPOT/.env" ]] && grep -q "$MOTIF_VARIABLE_POSTGRES_USER_ENV" "$RACINE_DEPOT/.env"; then
    utilisateur_postgres="$(grep "$MOTIF_VARIABLE_POSTGRES_USER_ENV" "$RACINE_DEPOT/.env" | head -n1 | cut -d= -f2- | tr -d '\r')"
  fi
  if [[ -z "${utilisateur_postgres// /}" ]]; then
    utilisateur_postgres="${POSTGRES_USER:-}"
  fi
  if [[ -z "${utilisateur_postgres// /}" ]]; then
    echo_err "POSTGRES_USER absent ou vide : renseignez-le dans .env (docker-compose et DATABASE_URL)."
    return 1
  fi
  if [[ -f "$RACINE_DEPOT/.env" ]] && grep -q '^POSTGRES_PASSWORD=' "$RACINE_DEPOT/.env"; then
    mot_de_passe="$(grep '^POSTGRES_PASSWORD=' "$RACINE_DEPOT/.env" | head -n1 | cut -d= -f2- | tr -d '\r')"
  fi
  if [[ -z "${mot_de_passe// /}" ]]; then
    mot_de_passe="${POSTGRES_PASSWORD:-}"
  fi
  if [[ -z "${mot_de_passe// /}" ]]; then
    echo_err "POSTGRES_PASSWORD absent ou vide : renseignez-le dans .env (docker-compose et DATABASE_URL)."
    return 1
  fi
  database_url_defaut="postgresql://${utilisateur_postgres}:${mot_de_passe}@127.0.0.1:5432/kydopanel"
  if grep -q '^DATABASE_URL=' "$RACINE_DEPOT/.env"; then
    val="$(grep '^DATABASE_URL=' "$RACINE_DEPOT/.env" | head -n1 | cut -d= -f2- | tr -d '\r')"
    if [[ -n "${val// /}" ]] && [[ "$KIDOPANEL_POSTGRES_IDENTIFIANTS_GENERES" -eq 0 ]]; then
      echo "DATABASE_URL déjà renseigné (non écrasé)."
      return 0
    fi
    tmp="$(mktemp)"
    grep -v '^DATABASE_URL=' "$RACINE_DEPOT/.env" >"$tmp"
    mv "$tmp" "$RACINE_DEPOT/.env"
  fi
  printf '%s\n' "DATABASE_URL=${database_url_defaut}" >>"$RACINE_DEPOT/.env"
  echo "DATABASE_URL défini pour le conteneur PostgreSQL du compose (${utilisateur_postgres}@127.0.0.1:5432)."
}

# Retourne 0 si l’IPv4 doit être traitée comme joignable depuis Internet (exclut RFC1918, lien local, CGNAT 100.64/10, boucle).
ipv4_est_candidate_hote_public_gateway() {
  local ip="$1"
  [[ "$ip" =~ ^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$ ]] || return 1
  local a b c d
  IFS=. read -r a b c d <<<"$ip"
  [[ "$a" =~ ^[0-9]+$ ]] && [[ "$b" =~ ^[0-9]+$ ]] && [[ "$c" =~ ^[0-9]+$ ]] && [[ "$d" =~ ^[0-9]+$ ]] || return 1
  ((a > 255 || b > 255 || c > 255 || d > 255)) && return 1
  ((a == 127)) && return 1
  ((a == 10)) && return 1
  ((a == 172 && b >= 16 && b <= 31)) && return 1
  ((a == 192 && b == 168)) && return 1
  ((a == 169 && b == 254)) && return 1
  ((a == 100 && b >= 64 && b <= 127)) && return 1
  return 0
}

# Détecte l’IPv4 publique de l’hôte et l’écrit dans .env si GATEWAY_PUBLIC_HOST_FOR_CLIENTS est absent ou vide.
detecter_et_ecrire_ip_publique_gateway() {
  [[ -f "$RACINE_DEPOT/.env" ]] || return 0
  local val_existante
  val_existante="$(grep '^GATEWAY_PUBLIC_HOST_FOR_CLIENTS=' "$RACINE_DEPOT/.env" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '\r' || true)"
  if [[ -n "${val_existante// /}" ]]; then
    echo "GATEWAY_PUBLIC_HOST_FOR_CLIENTS déjà défini (${val_existante}) : conservé."
    return 0
  fi
  local ip_publique=""
  ip_publique="$(curl -sf --connect-timeout 4 https://api.ipify.org 2>/dev/null | tr -d '[:space:]' || true)"
  if [[ -z "${ip_publique// /}" ]] || ! ipv4_est_candidate_hote_public_gateway "$ip_publique"; then
    ip_publique="$(curl -sf --connect-timeout 4 https://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || true)"
  fi
  if [[ -z "${ip_publique// /}" ]] || ! ipv4_est_candidate_hote_public_gateway "$ip_publique"; then
    ip_publique="$(curl -sf --connect-timeout 4 https://ifconfig.me/ip 2>/dev/null | tr -d '[:space:]' || true)"
  fi
  if [[ "$ip_publique" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] && ipv4_est_candidate_hote_public_gateway "$ip_publique"; then
    printf '\n%s\n' "GATEWAY_PUBLIC_HOST_FOR_CLIENTS=${ip_publique}" >>"$RACINE_DEPOT/.env"
    echo "IP publique détectée et écrite : GATEWAY_PUBLIC_HOST_FOR_CLIENTS=${ip_publique}"
  else
    echo "Avertissement : aucune IPv4 joignable depuis Internet détectée automatiquement (NAT, CGNAT ou réponse privée)."
    echo "Renseignez GATEWAY_PUBLIC_HOST_FOR_CLIENTS dans .env avec l’IP ou le DNS vu depuis les joueurs."
  fi
}

# Propose sudo NOPASSWD pour firewall-cmd et ufw (utilisateur courant) si les droits le permettent.
configurer_sudoers_parefeu_si_possible() {
  local utilisateur
  utilisateur="$(id -un)"
  [[ "$utilisateur" == "root" ]] && return 0

  local fichier_sudoers="/etc/sudoers.d/kidopanel-parefeu"
  local lignes=()
  if command -v firewall-cmd >/dev/null 2>&1; then
    lignes+=("${utilisateur} ALL=(ALL) NOPASSWD: $(command -v firewall-cmd)")
  fi
  if command -v ufw >/dev/null 2>&1; then
    lignes+=("${utilisateur} ALL=(ALL) NOPASSWD: $(command -v ufw)")
  fi
  [[ ${#lignes[@]} -eq 0 ]] && return 0

  if command -v sudo >/dev/null 2>&1 && sudo -n test -d /etc/sudoers.d 2>/dev/null; then
    {
      for ligne in "${lignes[@]}"; do
        printf '%s\n' "$ligne"
      done
    } | sudo tee "$fichier_sudoers" >/dev/null
    sudo chmod 440 "$fichier_sudoers"
    echo "Sudoers pare-feu : ${fichier_sudoers}"
  else
    echo "Avertissement : impossible d’écrire sudoers automatiquement (sudo NOPASSWD ou root requis)."
    echo "Pour l’ouverture automatique des ports Docker sur le pare-feu hôte, ajoutez par exemple :"
    printf '  %s\n' "${lignes[@]}"
  fi
}

# Crée ou complète le .env racine : copie depuis .env.example si besoin, puis secrets et base de données par défaut.
preparer_fichier_env_racine() {
  [[ -f "$RACINE_DEPOT/.env.example" ]] || {
    echo_err ".env.example introuvable."
    return 1
  }
  if [[ ! -f "$RACINE_DEPOT/.env" ]]; then
    cp "$RACINE_DEPOT/.env.example" "$RACINE_DEPOT/.env"
    echo "Fichier .env créé depuis .env.example."
  else
    echo "Fichier .env présent : vérification des variables obligatoires (sans écraser vos réglages métier)."
  fi
  assurer_gateway_jwt_secret_env_racine
  assurer_identifiants_postgres_env_racine
  assurer_database_url_si_postgres_docker
  detecter_et_ecrire_ip_publique_gateway
  return 0
}

preparer_env_web() {
  if [[ -f "$RACINE_DEPOT/apps/web/.env" ]] || [[ -f "$RACINE_DEPOT/apps/web/.env.local" ]]; then
    echo "apps/web : .env déjà présent."
    return 0
  fi
  if [[ -f "$RACINE_DEPOT/apps/web/.env.example" ]]; then
    cp "$RACINE_DEPOT/apps/web/.env.example" "$RACINE_DEPOT/apps/web/.env"
    echo "Créé apps/web/.env depuis .env.example (dev distant : proxy Vite par défaut vers la passerelle locale)."
  else
    printf '%s\n' \
      "# Optionnel : en pnpm dev sans ligne active, le front utilise http(s)://<hôte de la page>:3000." \
      "# VITE_GATEWAY_BASE_URL=http://127.0.0.1:3000" \
      >"$RACINE_DEPOT/apps/web/.env"
    echo "Créé apps/web/.env minimal (dev distant : proxy Vite par défaut si variable absente)."
  fi
  return 0
}

# Évite l’erreur « container name already in use » : arrêt du projet puis retrait du conteneur nommé réservé au panel.
preparer_stack_postgres_avant_montee() {
  "${DOCKER_COMPOSE[@]}" -f "$CHEMIN_COMPOSE_POSTGRES" down --remove-orphans 2>/dev/null || true
  if docker inspect "${NOM_CONTENEUR_POSTGRES_PANEL}" >/dev/null 2>&1; then
    echo "Suppression du conteneur « ${NOM_CONTENEUR_POSTGRES_PANEL} » orphelin ou obsolète (nom réservé au compose du panel)…"
    docker rm -f "${NOM_CONTENEUR_POSTGRES_PANEL}" 2>/dev/null || true
  fi
  return 0
}

demarrer_postgres_et_attendre() {
  local utilisateur_postgres
  assurer_docker_moteur
  assurer_docker_compose
  preparer_stack_postgres_avant_montee
  utilisateur_postgres="$(grep "$MOTIF_VARIABLE_POSTGRES_USER_ENV" "$RACINE_DEPOT/.env" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '\r' || true)"
  if [[ -z "${utilisateur_postgres// /}" ]]; then
    utilisateur_postgres="kydopanel"
  fi
  "${DOCKER_COMPOSE[@]}" -f "$CHEMIN_COMPOSE_POSTGRES" up -d
  echo "Attente PostgreSQL…"
  local t=0
  while [[ $t -lt 60 ]]; do
    if "${DOCKER_COMPOSE[@]}" -f "$CHEMIN_COMPOSE_POSTGRES" exec -T postgres \
      pg_isready -U "$utilisateur_postgres" -d kydopanel >/dev/null 2>&1; then
      echo "PostgreSQL prêt."
      return 0
    fi
    t=$((t + 1))
    sleep 1
  done
  echo_err "PostgreSQL injoignable (voir compose logs postgres)."
  return 1
}

# Vérifie que les identifiants PostgreSQL de .env permettent une connexion SQL réelle.
verifier_auth_postgres_depuis_env() {
  local utilisateur_postgres mot_de_passe
  utilisateur_postgres="$(grep "$MOTIF_VARIABLE_POSTGRES_USER_ENV" "$RACINE_DEPOT/.env" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '\r' || true)"
  mot_de_passe="$(grep '^POSTGRES_PASSWORD=' "$RACINE_DEPOT/.env" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '\r' || true)"
  [[ -n "${utilisateur_postgres// /}" ]] || return 1
  [[ -n "${mot_de_passe// /}" ]] || return 1
  "${DOCKER_COMPOSE[@]}" -f "$CHEMIN_COMPOSE_POSTGRES" exec -T postgres \
    sh -lc "PGPASSWORD='$mot_de_passe' psql -h 127.0.0.1 -U '$utilisateur_postgres' -d kydopanel -c 'select 1' >/dev/null"
}

# Première installation : si un ancien volume PostgreSQL conserve d’anciens identifiants, on le régénère.
reconcilier_auth_postgres_premiere_installation() {
  [[ "$SANS_POSTGRES_DOCKER" -eq 0 ]] || return 0
  verifier_auth_postgres_depuis_env && return 0
  echo "PostgreSQL répond mais refuse les identifiants de .env : réinitialisation du volume pour aligner l’installation initiale…"
  "${DOCKER_COMPOSE[@]}" -f "$CHEMIN_COMPOSE_POSTGRES" down -v --remove-orphans
  demarrer_postgres_et_attendre || return 1
  verifier_auth_postgres_depuis_env || {
    echo_err "Échec d’authentification PostgreSQL après réinitialisation du volume. Vérifiez POSTGRES_USER/POSTGRES_PASSWORD dans .env."
    return 1
  }
  echo "Authentification PostgreSQL validée avec les identifiants du .env."
  return 0
}

charger_env_pour_prisma() {
  set -a
  # shellcheck source=/dev/null
  source "$RACINE_DEPOT/.env"
  set +a
  return 0
}

etapes_dependances_build() {
  charger_chemin_node_si_present
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
  return 0
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
  return 0
}

# Arrêt des PIDs enregistrés puis libération des ports (évite EADDRINUSE si un vieux node écoute encore).
reinitialiser_processus_panel() {
  mkdir -p "$DIR_RUN"
  arreter_processus_pidfichier "$PID_WEB"
  arreter_processus_pidfichier "$PID_PASSERELLE"
  arreter_processus_pidfichier "$PID_SERVICE_WEB_METIER"
  arreter_processus_pidfichier "$PID_SERVER_JEUX"
  arreter_processus_pidfichier "$PID_MOTEUR"
  sleep 1
  liberer_port_tcp 5175
  liberer_port_tcp 5174
  liberer_port_tcp 5173
  liberer_port_tcp 3000
  liberer_port_tcp 8791
  liberer_port_tcp 8790
  liberer_port_tcp 8787
  sleep 1
  return 0
}

arreter_panel() {
  echo "Arrêt des processus du panel (si actifs)…"
  reinitialiser_processus_panel
  return 0
}

# Compile les paquets nécessaires aux processus `pnpm … start` (dist/main.js pour chaque service Node).
compiler_passerelle_et_moteur_avant_demarrage() {
  echo "Compilation (database → services métier → passerelle → moteur)…"
  cd "$RACINE_DEPOT"
  charger_chemin_node_si_present
  charger_env_pour_prisma
  pnpm --filter @kidopanel/database run build
  pnpm --filter server-service run build
  pnpm --filter web-service run build
  pnpm --filter gateway run build
  pnpm --filter container-engine run build
  echo "Compilation services / passerelle / moteur terminée."
  return 0
}

# Attente courte qu’un service HTTP réponde (health) après nohup.
attendre_service_http_local() {
  local url="$1"
  local nom_affichage="$2"
  local max_sec="${3:-45}"
  local i=0
  echo "Attente ${nom_affichage} (${url})…"
  while [[ $i -lt $max_sec ]]; do
    if curl -sf --connect-timeout 2 "$url" >/dev/null 2>&1; then
      echo "${nom_affichage} joignable."
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo_err "${nom_affichage} injoignable après ${max_sec}s — voir le journal correspondant sous ${LOG_DIR}/."
  return 1
}

# Attend que la passerelle réponde sur 127.0.0.1:3000 avant de lancer Vite (le proxy dev pointe vers cette adresse).
attendre_passerelle_proxy() {
  local max=60
  local i=0
  while [[ $i -lt $max ]]; do
    if curl -sf --connect-timeout 2 "http://127.0.0.1:3000/" >/dev/null 2>&1; then
      echo "Passerelle joignable sur 127.0.0.1:3000 (proxy Vite)."
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo_err "Passerelle injoignable sur http://127.0.0.1:3000 après ${max}s — consulter ${LOG_DIR}/passerelle.log ; le web démarre quand même."
  return 1
}

demarrer_panel() {
  mkdir -p "$DIR_RUN" "$LOG_DIR"
  cd "$RACINE_DEPOT"
  echo "Préparation : arrêt des anciens processus et libération des ports 5173–5175, 3000, 8787–8791…"
  reinitialiser_processus_panel
  compiler_passerelle_et_moteur_avant_demarrage
  echo "Démarrage du panel en arrière-plan (journaux : ${LOG_DIR}/)…"

  nohup bash -c "[[ -f \"${CHEMIN_ENV_NODE_PANEL}\" ]] && source \"${CHEMIN_ENV_NODE_PANEL}\"; cd \"$RACINE_DEPOT\" && set -a && source .env && set +a && exec pnpm --filter container-engine start" \
    >>"${LOG_DIR}/moteur.log" 2>&1 &
  echo $! >"$PID_MOTEUR"

  nohup bash -c "[[ -f \"${CHEMIN_ENV_NODE_PANEL}\" ]] && source \"${CHEMIN_ENV_NODE_PANEL}\"; cd \"$RACINE_DEPOT\" && set -a && source .env && set +a && exec pnpm --filter server-service start" \
    >>"${LOG_DIR}/server-jeux.log" 2>&1 &
  echo $! >"$PID_SERVER_JEUX"

  nohup bash -c "[[ -f \"${CHEMIN_ENV_NODE_PANEL}\" ]] && source \"${CHEMIN_ENV_NODE_PANEL}\"; cd \"$RACINE_DEPOT\" && set -a && source .env && set +a && exec pnpm --filter web-service start" \
    >>"${LOG_DIR}/service-web-metier.log" 2>&1 &
  echo $! >"$PID_SERVICE_WEB_METIER"

  attendre_service_http_local "http://127.0.0.1:8790/health" "Service instances jeu (server-service)" 45 || true
  attendre_service_http_local "http://127.0.0.1:8791/health" "Service web métier (web-service)" 45 || true

  nohup bash -c "[[ -f \"${CHEMIN_ENV_NODE_PANEL}\" ]] && source \"${CHEMIN_ENV_NODE_PANEL}\"; cd \"$RACINE_DEPOT\" && set -a && source .env && set +a && exec pnpm --filter gateway start" \
    >>"${LOG_DIR}/passerelle.log" 2>&1 &
  echo $! >"$PID_PASSERELLE"

  attendre_passerelle_proxy

  nohup bash -c "[[ -f \"${CHEMIN_ENV_NODE_PANEL}\" ]] && source \"${CHEMIN_ENV_NODE_PANEL}\"; cd \"$RACINE_DEPOT\" && exec pnpm --filter web run dev" \
    >>"${LOG_DIR}/web.log" 2>&1 &
  echo $! >"$PID_WEB"

  sleep 3
  echo "Processus lancés : moteur $(cat "$PID_MOTEUR"), instances jeu $(cat "$PID_SERVER_JEUX"), web métier $(cat "$PID_SERVICE_WEB_METIER"), passerelle $(cat "$PID_PASSERELLE"), web $(cat "$PID_WEB")."
  return 0
}

afficher_acces_panel() {
  echo ""
  echo "=== Panel démarré ==="
  echo "Interface : http://127.0.0.1:5173 (ou http://IP_DU_SERVEUR:5173 — Vite écoute sur 0.0.0.0)"
  echo "Passerelle : http://127.0.0.1:3000 (accès distant : via proxy Vite, pas besoin d’ouvrir le 3000 si apps/web/.env n’impose pas VITE_GATEWAY_BASE_URL vers :3000)"
  echo "Pare-feu / fournisseur cloud : ouvrir le port TCP 5173 pour l’interface depuis votre PC (ex. ufw allow 5173/tcp && ufw reload)."
  echo "Conteneurs : avec firewalld actif et droits sudo pour firewall-cmd (NOPASSWD recommandé), le moteur ouvre automatiquement les ports TCP/UDP publiés par Docker ; liste dans donnees/pare-feu-hote-kidopanel.json (fermée via le menu désinstallation)."
  echo "Serveurs de jeu : service HTTP http://127.0.0.1:8790 (création Minecraft / instances jeu via la passerelle)."
  echo "Hébergement web : service HTTP http://127.0.0.1:8791 (containers applicatifs / proxy manager)."
  echo "Journaux : tail -f \"${LOG_DIR}/moteur.log\" … server-jeux.log … service-web-metier.log … passerelle.log … web.log"
  echo "Arrêt / mise à jour : relancez ce script pour le menu."
  echo ""
  return 0
}

panel_marque_comme_pret() {
  mkdir -p "$DIR_RUN"
  touch "$FICHIER_MARQUEUR"
  return 0
}

installation_premiere_fois() {
  assurer_nodejs
  charger_chemin_node_si_present
  activer_pnpm
  preparer_fichier_env_racine || return 1
  if [[ "$SANS_POSTGRES_DOCKER" -eq 0 ]]; then
    demarrer_postgres_et_attendre
    reconcilier_auth_postgres_premiere_installation || return 1
  else
    echo "Sans postgres docker : vérifiez DATABASE_URL ; Docker reste requis pour le moteur de conteneurs."
    assurer_docker_moteur
  fi
  preparer_env_web
  configurer_sudoers_parefeu_si_possible
  [[ -f "$RACINE_DEPOT/.env" ]] || exit 1
  etapes_dependances_build
  panel_marque_comme_pret
  demarrer_panel
  afficher_acces_panel
  return 0
}

mettre_a_jour_et_redemarrer() {
  assurer_nodejs
  charger_chemin_node_si_present
  activer_pnpm
  preparer_fichier_env_racine || return 1
  [[ "$SANS_POSTGRES_DOCKER" -eq 0 ]] && demarrer_postgres_et_attendre || assurer_docker_moteur
  [[ -f "$RACINE_DEPOT/.env" ]] || {
    echo_err ".env manquant."
    return 1
  }
  configurer_sudoers_parefeu_si_possible
  arreter_panel
  etapes_dependances_build
  demarrer_panel
  afficher_acces_panel
  return 0
}

redemarrer_seulement() {
  assurer_nodejs
  charger_chemin_node_si_present
  activer_pnpm
  preparer_fichier_env_racine || return 1
  [[ -f "$RACINE_DEPOT/.env" ]] || {
    echo_err ".env manquant après préparation."
    return 1
  }
  [[ "$SANS_POSTGRES_DOCKER" -eq 0 ]] && demarrer_postgres_et_attendre || assurer_docker_moteur
  configurer_sudoers_parefeu_si_possible
  arreter_panel
  demarrer_panel
  afficher_acces_panel
  return 0
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
  read -r -p "Fermer dans firewalld les ports TCP/UDP enregistrés pour les conteneurs (fichier donnees/pare-feu-hote-kidopanel.json) ? [o/N] " c_fw
  if [[ "$c_fw" == "o" || "$c_fw" == "O" ]] && [[ -f "${RACINE_DEPOT}/infra/fermer-pare-feu-kidopanel.sh" ]]; then
    bash "${RACINE_DEPOT}/infra/fermer-pare-feu-kidopanel.sh" "$RACINE_DEPOT" || echo_err "Fermeture pare-feu : consulter les messages ci-dessus."
  elif [[ "$c_fw" == "o" || "$c_fw" == "O" ]]; then
    echo_err "Script infra/fermer-pare-feu-kidopanel.sh introuvable."
  fi
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
  if [[ "$c4" == "o" || "$c4" == "O" ]] && definir_commande_compose_si_disponible; then
    "${DOCKER_COMPOSE[@]}" -f "$CHEMIN_COMPOSE_POSTGRES" down
    echo "Compose arrêté."
  elif [[ "$c4" == "o" || "$c4" == "O" ]]; then
    echo_err "Docker Compose v2 indisponible : arrêt manuel du stack si besoin."
  fi
  read -r -p "Supprimer aussi le volume Postgres (docker compose down -v) ? [o/N] " c5
  if [[ "$c5" == "o" || "$c5" == "O" ]] && definir_commande_compose_si_disponible; then
    "${DOCKER_COMPOSE[@]}" -f "$CHEMIN_COMPOSE_POSTGRES" down -v
    echo "Volumes compose supprimés."
  fi
  rm -f "$FICHIER_MARQUEUR"
  echo "Marqueur d’installation retiré : une prochaine exécution refait une installation initiale."
  return 0
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
  return 0
}

# --- Point d’entrée ---

if [[ "$MODE_VERIFIER_SEULEMENT" -eq 1 ]]; then
  charger_chemin_node_si_present
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
