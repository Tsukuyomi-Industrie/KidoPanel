import type { Context } from "hono";
import type { ContainerOwnershipRepository } from "../../auth/container-ownership-repository.prisma.js";
import { verifyContainerOwnership } from "../../auth/verify-container-ownership.js";
import { estRoleAdministrateur } from "../../auth/autorisation-role.middleware.js";
import type { UtilisateurPublic } from "../../auth/user.types.js";
import { journaliserPasserelle } from "../../observabilite/journal-json.js";
import {
  decrementerFluxSsePasserelle,
  incrementerFluxSsePasserelle,
} from "../../observabilite/metriques-passerelle.js";
import { forwardRequestToContainerEngine } from "../proxy/container-engine-proxy.js";
import type { VariablesGateway } from "../types/gateway-variables.js";

const INTERVALLE_VERIF_PROPRIETE_MS = 2_000;

/**
 * Relaie le corps SSE du moteur tout en coupant le flux si la propriété du conteneur n’est plus valide en base.
 */
export async function proxyFluxJournauxSseAvecPropriete(
  c: Context<{ Variables: VariablesGateway }>,
  utilisateur: UtilisateurPublic,
  containerId: string,
  depotPropriete: ContainerOwnershipRepository,
): Promise<Response> {
  const requestId = c.get("requestId");
  const amont = await forwardRequestToContainerEngine(c);
  if (!amont.ok || !amont.body) {
    if (!amont.ok) {
      journaliserPasserelle({
        niveau: amont.status >= 500 ? "error" : "warn",
        message: "proxy_sse_journaux_rejet_amont",
        requestId,
        metadata: { statut: amont.status, containerId },
      });
    }
    return amont;
  }

  incrementerFluxSsePasserelle();
  journaliserPasserelle({
    niveau: "info",
    message: "flux_journaux_sse_ouvert_cote_passerelle",
    requestId,
    metadata: { containerId },
  });

  const entetesSortie = new Headers(amont.headers);
  entetesSortie.delete("content-length");
  entetesSortie.delete("transfer-encoding");

  const lecteurAmont = amont.body.getReader();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const redacteur = writable.getWriter();

  let pompageActif = true;
  const verification = setInterval(() => {
    (async () => {
      if (!pompageActif) {
        return;
      }
      if (estRoleAdministrateur(utilisateur.role)) {
        return;
      }
      const autorise = await verifyContainerOwnership(
        depotPropriete,
        utilisateur.id,
        containerId,
      );
      if (!autorise) {
        pompageActif = false;
        clearInterval(verification);
        await lecteurAmont.cancel();
      }
    })().catch(() => {});
  }, INTERVALLE_VERIF_PROPRIETE_MS);

  (async () => {
    try {
      for (;;) {
        const { value, done } = await lecteurAmont.read();
        if (done || !pompageActif) {
          break;
        }
        if (value) {
          await redacteur.write(value);
        }
      }
    } catch {
      // annulation côté client, propriété révoquée ou coupure réseau en aval
    } finally {
      pompageActif = false;
      clearInterval(verification);
      decrementerFluxSsePasserelle();
      journaliserPasserelle({
        niveau: "info",
        message: "flux_journaux_sse_ferme_cote_passerelle",
        requestId,
        metadata: { containerId },
      });
      await redacteur.close().catch(() => {});
    }
  })().catch(() => {});

  return new Response(readable, {
    status: amont.status,
    headers: entetesSortie,
  });
}
