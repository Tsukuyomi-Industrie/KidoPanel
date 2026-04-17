import { appelerPasserelle, corpsErreurDepuisReponse } from "../lab/passerelleClient.js";

export type IndicateursTableauPasserelle = {
  postgresql: { joignable: boolean; latenceMs?: number; message?: string };
  moteurDocker: { joignable: boolean; message?: string };
  conteneurs: { total: number; enLigne: number; horsLigne: number };
};

/**
 * Récupère les agrégats exposés par la passerelle pour le tableau de bord (authentification requise).
 */
export async function chargerIndicateursTableauPasserelle(): Promise<IndicateursTableauPasserelle> {
  const reponse = await appelerPasserelle("/panel/indicateurs", { method: "GET" });
  if (!reponse.ok) {
    const corps = await corpsErreurDepuisReponse(reponse);
    let message = `Indicateurs indisponibles (HTTP ${String(reponse.status)}).`;
    const brut = corps.jsonParse;
    if (
      typeof brut === "object" &&
      brut !== null &&
      "error" in brut &&
      typeof (brut as { error?: { message?: unknown } }).error?.message === "string"
    ) {
      message = (brut as { error: { message: string } }).error.message;
    }
    throw new Error(message);
  }
  return (await reponse.json()) as IndicateursTableauPasserelle;
}
