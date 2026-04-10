import type { Context, Next } from "hono";
import { jwtVerify } from "jose";

/**
 * Si `GATEWAY_JWT_SECRET` est défini, exige un JWT valide (HS256) dans `Authorization: Bearer`.
 * Sans secret configuré, aucune vérification n’est appliquée (phase de montée en charge).
 */
export async function jwtAuthReadyMiddleware(
  c: Context,
  next: Next,
): Promise<Response | void> {
  const secret = process.env.GATEWAY_JWT_SECRET?.trim();
  if (!secret) {
    await next();
    return;
  }

  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message:
            "Authentification requise : en-tête Authorization Bearer manquant.",
        },
      },
      401,
    );
  }

  const jeton = auth.slice("Bearer ".length).trim();
  if (!jeton) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Jeton d’accès vide.",
        },
      },
      401,
    );
  }

  try {
    const cle = new TextEncoder().encode(secret);
    await jwtVerify(jeton, cle);
  } catch {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Jeton d’accès invalide ou expiré.",
        },
      },
      401,
    );
  }

  await next();
}
