import { defineConfig } from "vitest/config";

/**
 * Exécution des tests d’intégration en série : une seule base PostgreSQL partagée par fichier de suite.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
