import type { ImageCatalogId } from "./images-officielles.js";

/**
 * Champ de formulaire exposé à l'utilisateur pour un gabarit Docker rapide.
 * Chaque champ correspond à une variable d'environnement ou à une option Docker
 * présentée de façon lisible, sans exposer les détails de l'API Docker Engine.
 */
export type ChampGabaritDockerRapide = {
  /** Clé technique (variable d'env Docker ou identifiant interne). */
  cle: string;
  /** Label affiché à l'utilisateur. */
  label: string;
  /** Description courte affichée sous le champ. */
  aide?: string;
  /** Type de champ HTML à générer. */
  type: "text" | "number" | "password" | "select";
  /** Valeur par défaut pré-remplie. */
  defaut?: string;
  /** Options pour le type "select". */
  options?: readonly { valeur: string; libelle: string }[];
  /** Rendre le champ obligatoire. */
  requis: boolean;
  /** Valeur minimale pour les champs number. */
  min?: number;
  /** Valeur maximale pour les champs number. */
  max?: number;
};

/**
 * Gabarit Docker rapide : préconfiguration complète d'un container
 * exposant uniquement les paramètres utiles à l'utilisateur final.
 */
export type GabaritDockerRapide = {
  id: string;
  nom: string;
  description: string;
  /** Identifiant de l'image dans le catalogue officiel. */
  imageCatalogId: ImageCatalogId;
  categorie: "web" | "base-de-donnees" | "runtime" | "cache";
  /** Ports internes exposés par défaut (port conteneur → port hôte suggéré). */
  mappingPortsDefaut: readonly {
    conteneur: number;
    hoteDefaut: number;
    protocole: "tcp" | "udp";
  }[];
  /** Champs affichés à l'utilisateur dans le formulaire simplifié. */
  champsFormulaire: readonly ChampGabaritDockerRapide[];
  /** Mémoire recommandée en Mo. */
  memoireRecommandeMb: number;
  /**
   * Commande par défaut lorsque l’image seule ne garantit pas un processus stable en arrière-plan
   * (ex. shell interactif sans script). Absent pour nginx, bases de données, etc.
   */
  cmdDockerParDefaut?: readonly string[];
};

export const LISTE_GABARITS_DOCKER_RAPIDE: readonly GabaritDockerRapide[] = [
  {
    id: "rapide-nginx",
    nom: "Site web — Nginx",
    description: "Serveur HTTP léger pour sites statiques ou reverse proxy.",
    imageCatalogId: "nginx",
    categorie: "web",
    mappingPortsDefaut: [{ conteneur: 80, hoteDefaut: 0, protocole: "tcp" }],
    memoireRecommandeMb: 256,
    champsFormulaire: [
      {
        cle: "NOM_CONTAINER",
        label: "Nom du container",
        aide: "Identifiant unique sur votre machine (lettres, chiffres, tirets).",
        type: "text",
        defaut: "mon-site-nginx",
        requis: true,
      },
      {
        cle: "PORT_HOTE",
        label: "Port d'accès externe",
        aide:
          "0 = attribution automatique d’un port libre sur l’hôte (évite les conflits). Sinon indiquez un port fixe entre 1 et 65535.",
        type: "number",
        defaut: "0",
        min: 0,
        max: 65535,
        requis: true,
      },
    ],
  },
  {
    id: "rapide-node",
    nom: "Application — Node.js",
    description:
      "Runtime Node.js pour applications JavaScript et API REST. Sans application montée, le conteneur reste actif avec une commande neutre (« sleep infinity ») : remplacez-la par votre script (ex. npm start) dans le formulaire expert ou les options avancées.",
    imageCatalogId: "node",
    categorie: "runtime",
    mappingPortsDefaut: [{ conteneur: 3000, hoteDefaut: 0, protocole: "tcp" }],
    memoireRecommandeMb: 512,
    cmdDockerParDefaut: ["sleep", "infinity"],
    champsFormulaire: [
      {
        cle: "NOM_CONTAINER",
        label: "Nom du container",
        type: "text",
        defaut: "mon-app-node",
        requis: true,
      },
      {
        cle: "PORT_HOTE",
        label: "Port d'accès externe",
        aide:
          "0 = attribution automatique d’un port libre sur l’hôte (évite les conflits). Sinon indiquez un port fixe entre 1 et 65535.",
        type: "number",
        defaut: "0",
        min: 0,
        max: 65535,
        requis: true,
      },
      {
        cle: "NODE_ENV",
        label: "Environnement Node.js",
        aide: "Détermine le mode de fonctionnement de l'application.",
        type: "select",
        defaut: "production",
        options: [
          { valeur: "production", libelle: "Production" },
          { valeur: "development", libelle: "Développement" },
        ],
        requis: true,
      },
    ],
  },
  {
    id: "rapide-postgres",
    nom: "Base de données — PostgreSQL",
    description: "Base relationnelle PostgreSQL pour vos applications.",
    imageCatalogId: "postgres",
    categorie: "base-de-donnees",
    mappingPortsDefaut: [{ conteneur: 5432, hoteDefaut: 0, protocole: "tcp" }],
    memoireRecommandeMb: 512,
    champsFormulaire: [
      {
        cle: "NOM_CONTAINER",
        label: "Nom du container",
        type: "text",
        defaut: "ma-base-postgres",
        requis: true,
      },
      {
        cle: "POSTGRES_DB",
        label: "Nom de la base de données",
        type: "text",
        defaut: "mabase",
        requis: true,
      },
      {
        cle: "POSTGRES_USER",
        label: "Nom d'utilisateur",
        type: "text",
        defaut: "admin",
        requis: true,
      },
      {
        cle: "POSTGRES_PASSWORD",
        label: "Mot de passe",
        aide: "Choisissez un mot de passe fort.",
        type: "password",
        requis: true,
      },
      {
        cle: "PORT_HOTE",
        label: "Port d'accès externe",
        aide:
          "0 = attribution automatique d’un port libre sur l’hôte (évite le conflit avec un PostgreSQL déjà installé). Sinon indiquez un port fixe entre 1 et 65535.",
        type: "number",
        defaut: "0",
        min: 0,
        max: 65535,
        requis: true,
      },
    ],
  },
  {
    id: "rapide-redis",
    nom: "Cache — Redis",
    description: "Stockage clé-valeur en mémoire pour cache et sessions.",
    imageCatalogId: "redis",
    categorie: "cache",
    mappingPortsDefaut: [{ conteneur: 6379, hoteDefaut: 0, protocole: "tcp" }],
    memoireRecommandeMb: 256,
    champsFormulaire: [
      {
        cle: "NOM_CONTAINER",
        label: "Nom du container",
        type: "text",
        defaut: "mon-cache-redis",
        requis: true,
      },
      {
        cle: "PORT_HOTE",
        label: "Port d'accès externe",
        aide:
          "0 = attribution automatique d’un port libre sur l’hôte (évite les conflits). Sinon indiquez un port fixe entre 1 et 65535.",
        type: "number",
        defaut: "0",
        min: 0,
        max: 65535,
        requis: true,
      },
    ],
  },
  {
    id: "rapide-mysql",
    nom: "Base de données — MySQL",
    description: "Base relationnelle MySQL compatible avec la plupart des CMS.",
    imageCatalogId: "mysql",
    categorie: "base-de-donnees",
    mappingPortsDefaut: [{ conteneur: 3306, hoteDefaut: 0, protocole: "tcp" }],
    memoireRecommandeMb: 512,
    champsFormulaire: [
      {
        cle: "NOM_CONTAINER",
        label: "Nom du container",
        type: "text",
        defaut: "ma-base-mysql",
        requis: true,
      },
      {
        cle: "MYSQL_DATABASE",
        label: "Nom de la base de données",
        type: "text",
        defaut: "mabase",
        requis: true,
      },
      {
        cle: "MYSQL_USER",
        label: "Nom d'utilisateur",
        type: "text",
        defaut: "admin",
        requis: true,
      },
      {
        cle: "MYSQL_PASSWORD",
        label: "Mot de passe utilisateur",
        type: "password",
        requis: true,
      },
      {
        cle: "MYSQL_ROOT_PASSWORD",
        label: "Mot de passe root",
        aide: "Mot de passe du superutilisateur MySQL.",
        type: "password",
        requis: true,
      },
      {
        cle: "PORT_HOTE",
        label: "Port d'accès externe",
        aide:
          "0 = attribution automatique d’un port libre sur l’hôte (évite les conflits). Sinon indiquez un port fixe entre 1 et 65535.",
        type: "number",
        defaut: "0",
        min: 0,
        max: 65535,
        requis: true,
      },
    ],
  },
];

export function listeGabaritsDockerRapide(): readonly GabaritDockerRapide[] {
  return LISTE_GABARITS_DOCKER_RAPIDE;
}

export function trouverGabaritDockerRapideParId(
  id: string,
): GabaritDockerRapide | undefined {
  return LISTE_GABARITS_DOCKER_RAPIDE.find((g) => g.id === id);
}
