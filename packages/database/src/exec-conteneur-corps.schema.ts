import { z } from "zod";

/** Corps JSON pour `POST /containers/:id/exec` (aligné sur le container-engine). */
export const execConteneurCorpsSchema = z.object({
  cmd: z.array(z.string().min(1)).min(1).max(48),
  stdinUtf8: z.string().max(2_000_000).optional(),
});

export type ExecConteneurCorps = z.infer<typeof execConteneurCorpsSchema>;
