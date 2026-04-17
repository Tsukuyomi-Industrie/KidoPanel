import path from "node:path";
import type { DockerClient } from "../docker-connection.js";

/**
 * Résout l’identifiant canonique Docker (64 caractères hex) pour nommer un fichier de journal stable.
 */
export async function resoudreIdCompletConteneur(
  docker: DockerClient,
  idReference: string,
): Promise<string> {
  const inspection = await docker.getContainer(idReference).inspect();
  return inspection.Id;
}

export function lireRepertoireJournauxConteneurs(): string {
  const depuisEnv = process.env.CONTAINER_ENGINE_JOURNAUX_CONTENEURS_DIR?.trim();
  if (depuisEnv && depuisEnv.length > 0) {
    return path.resolve(depuisEnv);
  }
  return path.resolve(process.cwd(), "donnees", "journaux-conteneurs-moteur");
}

export function cheminFichierLogPourId(repertoire: string, idComplet: string): string {
  const nomFichier = `${idComplet}.log`;
  return path.join(repertoire, nomFichier);
}

export function formaterLigneEvenementMoteur(
  libelleEvenement: string,
  meta?: Record<string, unknown>,
): string {
  const horodatage = new Date().toISOString();
  const suffixe = meta !== undefined ? ` ${JSON.stringify(meta)}` : "";
  return `[${horodatage}] [moteur] ${libelleEvenement}${suffixe}\n`;
}
