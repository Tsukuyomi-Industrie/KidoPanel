import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { ContainerEngine } from "../../container-engine.js";
import { tryRespondWithEngineError } from "../respond-route-error.js";
import {
  containerIdParamSchema,
  containerLogsQuerySchema,
  createContainerJsonSchema,
  listContainersQuerySchema,
  removeContainerQuerySchema,
  stopContainerJsonSchema,
} from "../schemas/container-api.schemas.js";

/** Enregistre les routes REST des conteneurs sur l’application Hono fournie. */
export function mountContainerRoutes(
  app: Hono,
  engine: ContainerEngine,
): void {
  app.get(
    "/containers",
    zValidator("query", listContainersQuerySchema),
    async (c) => {
      const { all } = c.req.valid("query");
      try {
        const containers = await engine.listContainers(all);
        return c.json({ containers });
      } catch (err) {
        const response = tryRespondWithEngineError(c, err);
        if (response) return response;
        throw err;
      }
    },
  );

  app.post(
    "/containers",
    zValidator("json", createContainerJsonSchema),
    async (c) => {
      const spec = c.req.valid("json");
      try {
        const result = await engine.createContainer(spec);
        return c.json(result, 201);
      } catch (err) {
        const response = tryRespondWithEngineError(c, err);
        if (response) return response;
        throw err;
      }
    },
  );

  app.post(
    "/containers/:id/start",
    zValidator("param", containerIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      try {
        await engine.startContainer(id);
        return new Response(null, { status: 204 });
      } catch (err) {
        const response = tryRespondWithEngineError(c, err);
        if (response) return response;
        throw err;
      }
    },
  );

  app.post("/containers/:id/stop", async (c) => {
    const paramParse = containerIdParamSchema.safeParse(c.req.param());
    if (!paramParse.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Identifiant de conteneur invalide dans l’URL.",
          },
        },
        400,
      );
    }
    const { id } = paramParse.data;
    let timeoutSeconds = 10;
    const raw = await c.req.text();
    if (raw.trim()) {
      let body: unknown;
      try {
        body = JSON.parse(raw) as unknown;
      } catch {
        return c.json(
          {
            error: {
              code: "INVALID_JSON",
              message: "Corps JSON invalide pour l’arrêt du conteneur.",
            },
          },
          400,
        );
      }
      const parsed = stopContainerJsonSchema.safeParse(body);
      if (!parsed.success) {
        return c.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Paramètres d’arrêt invalides.",
            },
          },
          400,
        );
      }
      if (parsed.data.timeoutSeconds !== undefined) {
        timeoutSeconds = parsed.data.timeoutSeconds;
      }
    }
    try {
      await engine.stopContainer(id, timeoutSeconds);
      return new Response(null, { status: 204 });
    } catch (err) {
      const response = tryRespondWithEngineError(c, err);
      if (response) return response;
      throw err;
    }
  });

  app.delete(
    "/containers/:id",
    zValidator("param", containerIdParamSchema),
    zValidator("query", removeContainerQuerySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { force } = c.req.valid("query");
      try {
        await engine.removeContainer(id, { force: force ?? false });
        return new Response(null, { status: 204 });
      } catch (err) {
        const response = tryRespondWithEngineError(c, err);
        if (response) return response;
        throw err;
      }
    },
  );

  app.get(
    "/containers/:id/logs",
    zValidator("param", containerIdParamSchema),
    zValidator("query", containerLogsQuerySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const query = c.req.valid("query");
      try {
        const logs = await engine.getLogs(id, {
          tail: query.tail,
          timestamps: query.timestamps,
        });
        return c.json({ logs });
      } catch (err) {
        const response = tryRespondWithEngineError(c, err);
        if (response) return response;
        throw err;
      }
    },
  );
}
