import type { GabaritJeuCatalogueInstance } from "@kidopanel/container-catalog";
import { ErreurMetierInstanceJeux } from "../erreurs/erreurs-metier-instance-jeu.js";

/**
 * Fusionne les variables utilisateur avec les défauts du gabarit et refuse si une clé requise manque.
 */
export function validerEtFusionnerVariablesEnvJeux(params: {
  gabarit: GabaritJeuCatalogueInstance;
  variablesUtilisateur: Record<string, string>;
  memoireMbInstance: number;
}): Record<string, string> {
  const fusionne: Record<string, string> = {};
  /**
   * Les images type itzg/minecraft-server attendent une unité JVM explicite pour MEMORY
   * (ex. 3072M, 4G). Sans suffixe, Java peut interpréter une taille invalide.
   */
  fusionne.MEMORY = `${String(params.memoireMbInstance)}M`;
  for (const [cle, valeur] of Object.entries(params.variablesUtilisateur)) {
    fusionne[cle.trim()] = valeur;
  }
  /**
   * Les images Minecraft Java/Bedrock exigent explicitement EULA=TRUE au démarrage.
   * Ce garde-fou backend évite un crash en boucle si le formulaire n’a pas fourni la variable.
   */
  if (
    params.gabarit.id === "tmpl-jeu-minecraft-java" ||
    params.gabarit.id === "tmpl-jeu-minecraft-bedrock"
  ) {
    fusionne.EULA = "TRUE";
  }
  const manquantes: string[] = [];
  for (const cle of params.gabarit.requiredEnv) {
    if (!(cle in fusionne) || fusionne[cle]?.trim() === "") {
      manquantes.push(cle);
    }
  }
  if (manquantes.length > 0) {
    throw new ErreurMetierInstanceJeux(
      "ENVIRONNEMENT_INSTANCE_INCOMPLET",
      `Variables d’environnement obligatoires absentes pour ce jeu : ${manquantes.join(", ")}.`,
      400,
      { manquantes },
    );
  }
  if (params.gabarit.id === "tmpl-jeu-valheim") {
    const motDePasseServeur = fusionne.SERVER_PASS?.trim() ?? "";
    if (motDePasseServeur.length < 5) {
      throw new ErreurMetierInstanceJeux(
        "ENVIRONNEMENT_INSTANCE_INCOMPLET",
        "Le mot de passe Valheim doit contenir au moins 5 caractères.",
        400,
        { cle: "SERVER_PASS", longueurMinimale: 5 },
      );
    }
  }
  return fusionne;
}
