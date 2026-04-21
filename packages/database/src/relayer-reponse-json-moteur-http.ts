import { normaliserStatutHttpReponseMoteurPourClient } from "./normaliser-statut-reponse-moteur-http.js";

/**
 * Reconstruit une réponse HTTP à partir d’un `fetch` vers le moteur, en conservant le corps texte
 * et en normalisant uniquement le code statut pour le client final.
 */
export async function construireReponseRelayDepuisFetchMoteur(
  amont: Response,
): Promise<Response> {
  const corps = await amont.text();
  const statut = normaliserStatutHttpReponseMoteurPourClient(amont.status);
  const typeContenu =
    amont.headers.get("Content-Type") ?? "application/json; charset=utf-8";
  return new Response(corps, {
    status: statut,
    headers: {
      "Content-Type": typeContenu,
    },
  });
}
