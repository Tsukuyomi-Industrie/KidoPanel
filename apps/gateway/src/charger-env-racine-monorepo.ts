import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Charge `.env` puis `.env.local` à la racine du dépôt Git pour aligner passerelle et services métier.
 */
const racineMonorepo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
dotenv.config({ path: path.join(racineMonorepo, ".env") });
dotenv.config({ path: path.join(racineMonorepo, ".env.local") });
