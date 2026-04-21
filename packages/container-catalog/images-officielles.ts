/**
 * Catalogue officiel des images Docker autorisées par KidoPanel.
 * Seule source de vérité pour les identifiants logiques et les références résolues côté moteur.
 */

/** Identifiants logiques stables exposés aux API et au stockage de configuration. */
export const IDENTIFIANTS_IMAGES_CATALOGUE = [
  "nginx",
  "redis",
  "node",
  "postgres",
  "mysql",
  "jeu-minecraft-java",
  "jeu-minecraft-bedrock",
  "jeu-valheim",
  "jeu-terraria",
  "jeu-satisfactory",
  "jeu-cs2",
  "jeu-ark",
  "jeu-personnalise",
] as const;

/** Union des identifiants présents dans {@link IDENTIFIANTS_IMAGES_CATALOGUE}. */
export type ImageCatalogId = (typeof IDENTIFIANTS_IMAGES_CATALOGUE)[number];

/** Libellé de catégorie métier pour filtrage ou affichage dans le panel. */
export type CategorieImageCatalogue =
  | "web"
  | "db"
  | "runtime"
  | "utilitaire"
  | "jeu";

/** Une entrée du catalogue : lien entre id métier et référence Docker exacte. */
export interface EntreeImageOfficielleCatalogue {
  readonly id: ImageCatalogId;
  readonly referenceDocker: string;
  readonly description: string;
  readonly categorie: CategorieImageCatalogue;
}

/**
 * Images supportées par le moteur : toute autre référence est refusée avant tout accès au démon.
 * L’ordre définit l’affichage par défaut dans les listes déroulantes du lab.
 */
export const IMAGES_OFFICIELLES: readonly EntreeImageOfficielleCatalogue[] = [
  {
    id: "nginx",
    referenceDocker: "nginx:alpine",
    description: "Serveur web et reverse proxy léger pour sites statiques ou relais HTTP.",
    categorie: "web",
  },
  {
    id: "redis",
    referenceDocker: "redis:7",
    description: "Moteur de cache et stockage clé-valeur en mémoire compatible Redis.",
    categorie: "db",
  },
  {
    id: "node",
    referenceDocker: "node:20-alpine",
    description: "Runtime JavaScript pour applications, outils de build ou scripts serveur.",
    categorie: "runtime",
  },
  {
    id: "postgres",
    referenceDocker: "postgres:16",
    description: "Serveur de bases de données relationnelles PostgreSQL en version stable 16.",
    categorie: "db",
  },
  {
    id: "mysql",
    referenceDocker: "mysql:8",
    description: "Serveur de bases de données relationnelles MySQL en version stable 8.",
    categorie: "db",
  },
  {
    id: "jeu-minecraft-java",
    referenceDocker: "itzg/minecraft-server:latest",
    description:
      "Serveur Minecraft Java (édition bureau) édité par la communauté itzg ; variables EULA et mémoire à fixer avant exposition.",
    categorie: "jeu",
  },
  {
    id: "jeu-minecraft-bedrock",
    referenceDocker: "itzg/minecraft-bedrock-server:latest",
    description: "Serveur Minecraft Bedrock compatible clients mobiles et consoles selon configuration.",
    categorie: "jeu",
  },
  {
    id: "jeu-valheim",
    referenceDocker: "ghcr.io/community-valheim-tools/valheim-server:latest",
    description: "Serveur dédié Valheim ; prévoir variables serveur et monde.",
    categorie: "jeu",
  },
  {
    id: "jeu-terraria",
    referenceDocker: "ryshe/terraria:latest",
    description: "Serveur Terraria ; valider la version du monde et les mots de passe opérateur.",
    categorie: "jeu",
  },
  {
    id: "jeu-satisfactory",
    referenceDocker: "wolveix/satisfactory-server:latest",
    description: "Serveur Satisfactory ; charge applicative élevée côté CPU et disque.",
    categorie: "jeu",
  },
  {
    id: "jeu-cs2",
    referenceDocker: "joedwards32/cs2:latest",
    description: "Serveur Counter-Strike 2 dédié ; configuration Steam et ports selon documentation de l’image.",
    categorie: "jeu",
  },
  {
    id: "jeu-ark",
    referenceDocker: "turzam/ark-server:latest",
    description:
      "Serveur ARK Survival Evolved ; image communautaire à confirmer sur l’environnement de production avant tirage.",
    categorie: "jeu",
  },
  {
    id: "jeu-personnalise",
    referenceDocker: "nginx:alpine",
    description:
      "Image technique pour le type de jeu personnalisé ; remplacer par l'image métier cible en production.",
    categorie: "jeu",
  },
];

const indexParId = new Map<string, EntreeImageOfficielleCatalogue>(
  IMAGES_OFFICIELLES.map((e) => [e.id, e]),
);

/** Indique si la chaîne correspond à un identifiant présent dans le catalogue officiel. */
export function estIdentifiantCatalogueValide(
  candidat: string,
): candidat is ImageCatalogId {
  return indexParId.has(candidat);
}

/** Retourne l’entrée catalogue pour un id connu, sinon `undefined`. */
export function trouverEntreeCatalogueParId(
  id: string,
): EntreeImageOfficielleCatalogue | undefined {
  return indexParId.get(id);
}

/**
 * Retourne l’identifiant catalogue correspondant à une référence Docker exacte du catalogue,
 * pour compatibilité de lecture des anciennes configurations JSON utilisant la clé `image`.
 */
export function trouverIdCatalogueDepuisReferenceDocker(
  referenceDocker: string,
): ImageCatalogId | undefined {
  const ref = referenceDocker.trim();
  return IMAGES_OFFICIELLES.find((e) => e.referenceDocker === ref)?.id;
}

/** Liste immuable des entrées du catalogue officiel. */
export function listerEntreesCatalogueOfficiel(): readonly EntreeImageOfficielleCatalogue[] {
  return IMAGES_OFFICIELLES;
}

/** Élément d’une réponse `GET /images` : métadonnées catalogue sans inspection Docker. */
export interface ImageCatalogueApi {
  id: ImageCatalogId;
  referenceDocker: string;
  description: string;
  categorie: CategorieImageCatalogue;
}

/** Construit la charge utile HTTP standardisée pour la liste d’images du catalogue. */
export function construireReponseListeCatalogueImages(): {
  images: ImageCatalogueApi[];
} {
  return {
    images: IMAGES_OFFICIELLES.map((e) => ({
      id: e.id,
      referenceDocker: e.referenceDocker,
      description: e.description,
      categorie: e.categorie,
    })),
  };
}
