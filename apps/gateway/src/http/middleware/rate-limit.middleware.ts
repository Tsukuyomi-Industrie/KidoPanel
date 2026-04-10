import type { Context, Next } from "hono";

type Seau = { compteur: number; finFenetre: number };

const seaux = new Map<string, Seau>();

function cleClient(c: Context): string {
  const xff = c.req.header("x-forwarded-for");
  const premier = xff?.split(",")[0]?.trim();
  if (premier) return premier;
  const reel = c.req.header("x-real-ip");
  if (reel) return reel;
  return "inconnu";
}

/**
 * Limite le nombre de requêtes par fenêtre glissante et par client (IP ou en-tête de confiance).
 */
export function creerMiddlewareRateLimit(
  maxParFenetre: number,
  fenetreMs: number,
) {
  return async function middlewareRateLimit(
    c: Context,
    next: Next,
  ): Promise<Response | void> {
    const maintenant = Date.now();
    const cle = cleClient(c);
    let seau = seaux.get(cle);
    if (!seau || maintenant >= seau.finFenetre) {
      seau = { compteur: 0, finFenetre: maintenant + fenetreMs };
      seaux.set(cle, seau);
    }
    seau.compteur += 1;
    if (seau.compteur > maxParFenetre) {
      return c.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message:
              "Limite de requêtes atteinte pour cette fenêtre. Réessayez plus tard.",
          },
        },
        429,
      );
    }
    await next();
  };
}
