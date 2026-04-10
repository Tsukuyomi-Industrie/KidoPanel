import { prisma } from "@kidopanel/database";

const URL_MOTEUR_FICTIF = "http://127.0.0.1:19999";
const SECRET_JWT_DEFAUT_TEST =
  "cle-jwt-tests-integration-passerelle-32chars!";

/**
 * Indique si la suite d’intégration peut s’exécuter (PostgreSQL joignable via Prisma).
 */
export function integrationPostgresDisponible(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * Applique les variables d’environnement attendues par `createGatewayApp` et le mock moteur.
 */
export function appliquerEnvPasserelleIntegration(): string {
  process.env.CONTAINER_ENGINE_BASE_URL = URL_MOTEUR_FICTIF;
  process.env.GATEWAY_RATE_LIMIT_MAX = "100000";
  process.env.GATEWAY_RATE_LIMIT_WINDOW_MS = "60000";
  if (!process.env.GATEWAY_JWT_SECRET?.trim()) {
    process.env.GATEWAY_JWT_SECRET = SECRET_JWT_DEFAUT_TEST;
  }
  return URL_MOTEUR_FICTIF;
}

/**
 * Vide les tables utilisateur et propriété pour un jeu de tests reproductible.
 */
export async function nettoyerBasePourTestsIntegration(): Promise<void> {
  await prisma.containerOwnership.deleteMany();
  await prisma.user.deleteMany();
}

export { prisma };
