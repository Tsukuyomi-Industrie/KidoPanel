import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import {
  corpsConnexionSchema,
  corpsInscriptionSchema,
} from "../../auth/auth.schemas.js";
import type { ServiceAuth } from "../../auth/auth.service.js";
import { journaliserPasserelle } from "../../observabilite/journal-json.js";
import type { VariablesGateway } from "../types/gateway-variables.js";

/**
 * Routes publiques d’inscription et de connexion ; émettent un JWT après succès.
 */
export function monterRoutesAuth(
  app: Hono<{ Variables: VariablesGateway }>,
  serviceAuth: ServiceAuth,
): void {
  const auth = new Hono<{ Variables: VariablesGateway }>();

  auth.post(
    "/register",
    zValidator("json", corpsInscriptionSchema),
    async (c) => {
      const { email, password } = c.req.valid("json");
      try {
        const { jeton, utilisateur } = await serviceAuth.inscrire(email, password);
        journaliserPasserelle({
          niveau: "info",
          message: "inscription_reussie",
          requestId: c.get("requestId"),
          metadata: { utilisateurId: utilisateur.id },
        });
        return c.json(
          {
            token: jeton,
            user: {
              id: utilisateur.id,
              email: utilisateur.email,
              role: utilisateur.role,
            },
          },
          201,
        );
      } catch (error_) {
        if (
          error_ instanceof Error &&
          error_.message === "EMAIL_DEJA_UTILISE"
        ) {
          journaliserPasserelle({
            niveau: "warn",
            message: "inscription_refusee_email_deja_utilise",
            requestId: c.get("requestId"),
          });
          return c.json(
            {
              error: {
                code: "EMAIL_ALREADY_REGISTERED",
                message: "Un compte existe déjà avec cette adresse e-mail.",
              },
            },
            409,
          );
        }
        throw error_;
      }
    },
  );

  auth.post("/login", zValidator("json", corpsConnexionSchema), async (c) => {
    const { email, password } = c.req.valid("json");
    try {
      const { jeton, utilisateur } = await serviceAuth.connecter(email, password);
      journaliserPasserelle({
        niveau: "info",
        message: "connexion_reussie",
        requestId: c.get("requestId"),
        metadata: { utilisateurId: utilisateur.id },
      });
      return c.json({
        token: jeton,
        user: {
          id: utilisateur.id,
          email: utilisateur.email,
          role: utilisateur.role,
        },
      });
    } catch (error_) {
      if (
        error_ instanceof Error &&
        error_.message === "IDENTIFIANTS_INVALIDES"
      ) {
        journaliserPasserelle({
          niveau: "warn",
          message: "connexion_refusee_identifiants_invalides",
          requestId: c.get("requestId"),
        });
        return c.json(
          {
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Adresse e-mail ou mot de passe incorrect.",
            },
          },
          401,
        );
      }
      throw error_;
    }
  });

  app.route("/auth", auth);
}
