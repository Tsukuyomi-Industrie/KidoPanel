import { expect } from "vitest";
import type { Hono } from "hono";

const ORIGINE = "http://localhost";

export async function assertAccesConteneurRefuse(reponse: Response): Promise<void> {
  expect(reponse.status).toBe(403);
  const corps = (await reponse.json()) as {
    error?: { code?: string };
  };
  expect(corps.error?.code).toBe("CONTAINER_ACCESS_DENIED");
}

export async function inscrireUtilisateurTest(
  app: Hono,
  email: string,
  motDePasse: string,
): Promise<{ jeton: string; idUtilisateur: string }> {
  const reponse = await app.request(`${ORIGINE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: motDePasse }),
  });
  expect(reponse.status).toBe(201);
  const corps = (await reponse.json()) as {
    token: string;
    user: { id: string };
  };
  return { jeton: corps.token, idUtilisateur: corps.user.id };
}

export async function creerConteneurViaPasserelle(
  app: Hono,
  jeton: string,
): Promise<string> {
  const reponse = await app.request(`${ORIGINE}/containers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jeton}`,
    },
    body: JSON.stringify({ image: "alpine:3.19" }),
  });
  expect(reponse.status).toBe(201);
  const corps = (await reponse.json()) as { id: string };
  return corps.id;
}
