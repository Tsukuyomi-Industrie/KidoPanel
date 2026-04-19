import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Charge `.env` puis `.env.local` à la racine du dépôt Git avant lecture de `DATABASE_URL`.
 * Sans cela, un `node dist/main.js` lancé depuis le paquet ne voit pas les variables du fichier racine.
 */
const racineMonorepo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
dotenv.config({ path: path.join(racineMonorepo, ".env") });
dotenv.config({ path: path.join(racineMonorepo, ".env.local") });
