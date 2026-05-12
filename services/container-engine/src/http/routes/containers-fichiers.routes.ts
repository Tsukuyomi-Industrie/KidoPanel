import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { ContainerEngine } from "../../container-engine.js";
import { tryRespondWithEngineError } from "../respond-route-error.js";
import type { VariablesMoteurHttp } from "../variables-moteur-http.js";
import { containerIdParamSchema } from "../schemas/container-api.schemas.js";
import {
  compresserCheminViaExec,
  decompresserArchiveZipViaExec,
  ecrireFichierTexteViaExec,
  listerRepertoireViaExec,
  lireFichierTexteViaExec,
  supprimerCheminViaExec,
} from "../../fichiers-conteneur/operations-fs-conteneur-via-exec.service.js";

const cheminQuerySchema = z.object({
  path: z.string().min(1).max(4096),
});

const compressionFsSchema = z.object({
  sourcePath: z.string().min(1).max(4096),
  archivePath: z.string().min(1).max(4096),
});

const decompressionFsSchema = z.object({
  archivePath: z.string().min(1).max(4096),
  destinationPath: z.string().min(1).max(4096),
});

/** Routes lecture / écriture fichiers conteneur (via exec Docker uniquement). */
export function mountContainerFichiersRoutes(
  app: Hono<{ Variables: VariablesMoteurHttp }>,
  engine: ContainerEngine,
): void {
  app.get(
    "/containers/:id/fs/list",
    zValidator("param", containerIdParamSchema),
    zValidator("query", cheminQuerySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { path: cheminBrut } = c.req.valid("query");
      try {
        const { entrees } = await listerRepertoireViaExec({
          engine,
          idConteneur: id,
          cheminAbsoluBrut: cheminBrut,
        });
        return c.json({ entries: entrees });
      } catch (error_) {
        const response = tryRespondWithEngineError(c, error_);
        if (response) return response;
        const message =
          error_ instanceof Error ? error_.message : "Liste impossible.";
        return c.json({ error: { code: "FS_LIST_ERROR", message } }, 400);
      }
    },
  );

  app.get(
    "/containers/:id/fs/content",
    zValidator("param", containerIdParamSchema),
    zValidator("query", cheminQuerySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { path: cheminBrut } = c.req.valid("query");
      try {
        const { contenuUtf8 } = await lireFichierTexteViaExec({
          engine,
          idConteneur: id,
          cheminAbsoluBrut: cheminBrut,
        });
        return c.json({ contentUtf8: contenuUtf8 });
      } catch (error_) {
        const response = tryRespondWithEngineError(c, error_);
        if (response) return response;
        const message =
          error_ instanceof Error ? error_.message : "Lecture impossible.";
        return c.json({ error: { code: "FS_READ_ERROR", message } }, 400);
      }
    },
  );

  app.put(
    "/containers/:id/fs/content",
    zValidator("param", containerIdParamSchema),
    zValidator("query", cheminQuerySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { path: cheminBrut } = c.req.valid("query");
      const contenuBrut = await c.req.text();
      try {
        await ecrireFichierTexteViaExec({
          engine,
          idConteneur: id,
          cheminAbsoluBrut: cheminBrut,
          contenuUtf8: contenuBrut,
        });
        return new Response(null, { status: 204 });
      } catch (error_) {
        const response = tryRespondWithEngineError(c, error_);
        if (response) return response;
        const message =
          error_ instanceof Error ? error_.message : "Écriture impossible.";
        return c.json({ error: { code: "FS_WRITE_ERROR", message } }, 400);
      }
    },
  );

  app.delete(
    "/containers/:id/fs",
    zValidator("param", containerIdParamSchema),
    zValidator("query", cheminQuerySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { path: cheminBrut } = c.req.valid("query");
      try {
        await supprimerCheminViaExec({
          engine,
          idConteneur: id,
          cheminAbsoluBrut: cheminBrut,
        });
        return new Response(null, { status: 204 });
      } catch (error_) {
        const response = tryRespondWithEngineError(c, error_);
        if (response) return response;
        const message =
          error_ instanceof Error ? error_.message : "Suppression impossible.";
        return c.json({ error: { code: "FS_DELETE_ERROR", message } }, 400);
      }
    },
  );

  app.post(
    "/containers/:id/fs/zip",
    zValidator("param", containerIdParamSchema),
    zValidator("json", compressionFsSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const corps = c.req.valid("json");
      try {
        await compresserCheminViaExec({
          engine,
          idConteneur: id,
          cheminSourceAbsoluBrut: corps.sourcePath,
          cheminArchiveAbsoluBrut: corps.archivePath,
        });
        return new Response(null, { status: 204 });
      } catch (error_) {
        const response = tryRespondWithEngineError(c, error_);
        if (response) return response;
        const message =
          error_ instanceof Error ? error_.message : "Compression zip impossible.";
        return c.json({ error: { code: "FS_ZIP_ERROR", message } }, 400);
      }
    },
  );

  app.post(
    "/containers/:id/fs/unzip",
    zValidator("param", containerIdParamSchema),
    zValidator("json", decompressionFsSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const corps = c.req.valid("json");
      try {
        await decompresserArchiveZipViaExec({
          engine,
          idConteneur: id,
          cheminArchiveAbsoluBrut: corps.archivePath,
          cheminDestinationAbsoluBrut: corps.destinationPath,
        });
        return new Response(null, { status: 204 });
      } catch (error_) {
        const response = tryRespondWithEngineError(c, error_);
        if (response) return response;
        const message =
          error_ instanceof Error ? error_.message : "Décompression zip impossible.";
        return c.json({ error: { code: "FS_UNZIP_ERROR", message } }, 400);
      }
    },
  );
}
