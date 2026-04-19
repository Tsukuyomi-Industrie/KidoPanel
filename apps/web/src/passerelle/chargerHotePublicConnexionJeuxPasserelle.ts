import { appelerPasserelle } from "../lab/passerelleClient.js";

/** Réponse passerelle pour l’hôte public forcé des connexions jeu (IP ou DNS joignable depuis Internet). */
export type ReponseAdresseConnexionJeuxPasserelle = {
  hotePublicPourJeux: string | null;
};

/**
 * Lit l’adresse publique à utiliser pour afficher « IP : port » aux joueurs, si configurée sur la passerelle.
 */
export async function chargerHotePublicConnexionJeuxPasserelle(): Promise<string | null> {
  const reponse = await appelerPasserelle("/panel/adresse-connexion-jeux", {
    method: "GET",
  });
  if (!reponse.ok) {
    return null;
  }
  const corps = (await reponse.json()) as unknown;
  if (
    typeof corps !== "object" ||
    corps === null ||
    !("hotePublicPourJeux" in corps)
  ) {
    return null;
  }
  const v = (corps as { hotePublicPourJeux: unknown }).hotePublicPourJeux;
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}
