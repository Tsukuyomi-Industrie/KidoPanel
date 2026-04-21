/**
 * Harmonise la réponse HTTP brute du container-engine pour les erreurs métier renvoyées au client :
 * conserve un statut dans la plage client 4xx–5xx lorsqu’il est exploitable, sinon **502**.
 */
export function normaliserStatutHttpReponseMoteurPourClient(statutBrut: number): number {
  return statutBrut >= 400 && statutBrut < 600 ? statutBrut : 502;
}
