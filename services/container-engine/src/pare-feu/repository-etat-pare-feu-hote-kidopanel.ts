import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PublicationHotePareFeu } from "./types-publication-hote-pare-feu.js";

type FichierEtatV1 = {
  version: 1;
  entrees: Array<{
    idConteneurDocker: string;
    ports: PublicationHotePareFeu[];
    sorties?: Array<{
      protocole: "tcp" | "udp";
      debutPort: number;
      finPort: number;
    }>;
  }>;
};

/**
 * Calcule le chemin du fichier JSON listant les ports pare-feu associés aux conteneurs KidoPanel.
 */
export function resoudreCheminFichierEtatPareFeuDepuisEnv(): string {
  const brut = process.env.CONTAINER_ENGINE_PAREFEU_STATE_PATH?.trim();
  if (brut !== undefined && brut.length > 0) {
    return path.isAbsolute(brut) ? brut : path.resolve(process.cwd(), brut);
  }
  return path.resolve(process.cwd(), "donnees", "pare-feu-hote-kidopanel.json");
}

function normaliserIdPourCle(id: string): string {
  return id.replace(/^sha256:/i, "").toLowerCase();
}

function idsConteneurCorrespondent(a: string, b: string): boolean {
  const na = normaliserIdPourCle(a);
  const nb = normaliserIdPourCle(b);
  return na === nb || na.startsWith(nb) || nb.startsWith(na);
}

/**
 * Persistance locale des associations conteneur → ports ouverts sur le pare-feu hôte.
 */
export class RepositoryEtatPareFeuHoteKidopanel {
  constructor(private readonly cheminAbsolu: string) {}

  /** Charge l’état ou une structure vide si le fichier est absent ou invalide. */
  async charger(): Promise<FichierEtatV1> {
    try {
      const texte = await readFile(this.cheminAbsolu, "utf8");
      const parse = JSON.parse(texte) as unknown;
      if (
        typeof parse !== "object" ||
        parse === null ||
        !("version" in parse) ||
        (parse as FichierEtatV1).version !== 1 ||
        !("entrees" in parse) ||
        !Array.isArray((parse as FichierEtatV1).entrees)
      ) {
        return { version: 1, entrees: [] };
      }
      return parse as FichierEtatV1;
    } catch {
      return { version: 1, entrees: [] };
    }
  }

  /** Enregistre tout le fichier (écriture atomique simple). */
  async enregistrerComplet(donnees: FichierEtatV1): Promise<void> {
    await mkdir(path.dirname(this.cheminAbsolu), { recursive: true });
    await writeFile(
      this.cheminAbsolu,
      `${JSON.stringify(donnees, null, 2)}\n`,
      "utf8",
    );
  }

  /** Retourne l’entrée dont l’identifiant Docker correspond à la référence fournie. */
  async trouverEntreePourIdConteneur(idReference: string): Promise<{
    index: number;
    entree: FichierEtatV1["entrees"][number];
  } | null> {
    const etat = await this.charger();
    const index = etat.entrees.findIndex((e) =>
      idsConteneurCorrespondent(e.idConteneurDocker, idReference),
    );
    if (index < 0) {
      return null;
    }
    const entreeResolue = etat.entrees[index];
    if (entreeResolue === undefined) {
      return null;
    }
    return { index, entree: entreeResolue };
  }

  /**
   * Remplace ou ajoute l’entrée pour ce conteneur ; identifiant canonique = inspection.Id complet.
   */
  async remplacerEntreeConteneur(
    idCompletDocker: string,
    ports: PublicationHotePareFeu[],
    sorties?: Array<{
      protocole: "tcp" | "udp";
      debutPort: number;
      finPort: number;
    }>,
  ): Promise<void> {
    const etat = await this.charger();
    const sansDoublon = etat.entrees.filter(
      (e) => !idsConteneurCorrespondent(e.idConteneurDocker, idCompletDocker),
    );
    sansDoublon.push({
      idConteneurDocker: idCompletDocker,
      ports: [...ports],
      ...(sorties === undefined || sorties.length === 0 ? {} : { sorties }),
    });
    await this.enregistrerComplet({ version: 1, entrees: sansDoublon });
  }

  /** Supprime l’entrée correspondant au conteneur ; retourne les ports qui étaient suivis. */
  async retirerEntreePourIdConteneur(idReference: string): Promise<PublicationHotePareFeu[]> {
    const etat = await this.charger();
    const conserve: FichierEtatV1["entrees"] = [];
    let retires: PublicationHotePareFeu[] = [];
    for (const entree of etat.entrees) {
      if (idsConteneurCorrespondent(entree.idConteneurDocker, idReference)) {
        retires = [...entree.ports];
      } else {
        conserve.push(entree);
      }
    }
    await this.enregistrerComplet({ version: 1, entrees: conserve });
    return retires;
  }
}
