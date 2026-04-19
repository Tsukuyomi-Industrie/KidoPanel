import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import type { Hono } from "hono";
import {
  creerEtatMockMoteur,
  creerFetchMockMoteurConteneurs,
  type EtatMockMoteurConteneurs,
} from "./helpers/moteur-conteneurs-mock-integ.js";
import {
  appliquerEnvPasserelleIntegration,
  integrationPostgresDisponible,
  nettoyerBasePourTestsIntegration,
  prisma,
} from "./helpers/passerelle-integration-setup.js";
import {
  assertAccesConteneurRefuse,
  creerConteneurViaPasserelle,
  inscrireUtilisateurTest,
} from "./helpers/requetes-passerelle-test.js";

const ORIGINE = "http://localhost";

describe("vérification statique du montage des routes proxy conteneurs", () => {
  it("attache chaque verbe HTTP sensible au relais unique", () => {
    const cheminFichier = fileURLToPath(
      new URL("../../src/http/routes/containers-proxy.routes.ts", import.meta.url),
    );
    const source = readFileSync(cheminFichier, "utf8");
    expect(source).toContain("proxyListeConteneursGet");
    expect(source).toContain("proxyCreationConteneursPost");
    expect(source).toMatch(/conteneurs\.get\("\/",/);
    expect(source).toMatch(/conteneurs\.post\("\/",/);
    expect(source).toContain('conteneurs.post("/:id/start", relayer)');
    expect(source).toContain('conteneurs.post("/:id/stop", relayer)');
    expect(source).toContain('conteneurs.delete("/:id", relayer)');
    expect(source).toContain('conteneurs.get("/:id/logs/stream", relayer)');
    expect(source).toContain('conteneurs.get("/:id/logs", relayer)');
  });
});

describe.skipIf(!integrationPostgresDisponible())(
  "intégration — isolation multi-utilisateur, actions conteneurs et SSE journaux",
  () => {
    let createGatewayApp: () => Hono;
    let fetchReel: typeof fetch;
    let etatMoteur: EtatMockMoteurConteneurs;

    beforeAll(async () => {
      appliquerEnvPasserelleIntegration();
      fetchReel = globalThis.fetch.bind(globalThis);
      const moduleApp = await import("../../src/http/create-gateway-app.js");
      createGatewayApp = moduleApp.createGatewayApp;
    });

    beforeEach(async () => {
      await nettoyerBasePourTestsIntegration();
      const base = process.env.CONTAINER_ENGINE_BASE_URL!.replace(/\/+$/, "");
      etatMoteur = creerEtatMockMoteur(base);
      globalThis.fetch = creerFetchMockMoteurConteneurs(etatMoteur, fetchReel);
    });

    afterAll(async () => {
      globalThis.fetch = fetchReel;
      await prisma.$disconnect();
    });

    it("chaque utilisateur ne voit que ses conteneurs sur GET /containers", async () => {
      const app = createGatewayApp();
      const a = await inscrireUtilisateurTest(app, "a.iso@example.com", "motdepasse12");
      const b = await inscrireUtilisateurTest(app, "b.iso@example.com", "motdepasse12");
      const idA = await creerConteneurViaPasserelle(app, a.jeton);
      const idB = await creerConteneurViaPasserelle(app, b.jeton);

      const listeA = await app.request(`${ORIGINE}/containers`, {
        headers: { Authorization: `Bearer ${a.jeton}` },
      });
      const listeB = await app.request(`${ORIGINE}/containers`, {
        headers: { Authorization: `Bearer ${b.jeton}` },
      });
      expect(listeA.status).toBe(200);
      expect(listeB.status).toBe(200);
      const corpsA = (await listeA.json()) as { containers: Array<{ id: string }> };
      const corpsB = (await listeB.json()) as { containers: Array<{ id: string }> };
      expect(corpsA.containers.map((c) => c.id)).toEqual([idA]);
      expect(corpsB.containers.map((c) => c.id)).toEqual([idB]);
      expect(corpsA.containers.some((c) => c.id === idB)).toBe(false);
      expect(corpsB.containers.some((c) => c.id === idA)).toBe(false);
    });

    it("refuse start, stop, logs JSON et delete croisés avec CONTAINER_ACCESS_DENIED", async () => {
      const app = createGatewayApp();
      const a = await inscrireUtilisateurTest(app, "a.act@example.com", "motdepasse12");
      const b = await inscrireUtilisateurTest(app, "b.act@example.com", "motdepasse12");
      const idA = await creerConteneurViaPasserelle(app, a.jeton);
      const idB = await creerConteneurViaPasserelle(app, b.jeton);

      const enteteA = { Authorization: `Bearer ${a.jeton}` };
      const enteteB = { Authorization: `Bearer ${b.jeton}` };

      await assertAccesConteneurRefuse(
        await app.request(`${ORIGINE}/containers/${idB}/start`, {
          method: "POST",
          headers: enteteA,
        }),
      );
      await assertAccesConteneurRefuse(
        await app.request(`${ORIGINE}/containers/${idB}/stop`, {
          method: "POST",
          headers: { ...enteteA, "Content-Type": "application/json" },
          body: "{}",
        }),
      );
      await assertAccesConteneurRefuse(
        await app.request(`${ORIGINE}/containers/${idB}/logs`, {
          method: "GET",
          headers: enteteA,
        }),
      );
      await assertAccesConteneurRefuse(
        await app.request(`${ORIGINE}/containers/${idB}`, {
          method: "DELETE",
          headers: enteteA,
        }),
      );

      await assertAccesConteneurRefuse(
        await app.request(`${ORIGINE}/containers/${idA}/start`, {
          method: "POST",
          headers: enteteB,
        }),
      );
      await assertAccesConteneurRefuse(
        await app.request(`${ORIGINE}/containers/${idA}/stop`, {
          method: "POST",
          headers: { ...enteteB, "Content-Type": "application/json" },
          body: "{}",
        }),
      );
      await assertAccesConteneurRefuse(
        await app.request(`${ORIGINE}/containers/${idA}/logs`, {
          method: "GET",
          headers: enteteB,
        }),
      );
      await assertAccesConteneurRefuse(
        await app.request(`${ORIGINE}/containers/${idA}`, {
          method: "DELETE",
          headers: enteteB,
        }),
      );
    });

    it("après DELETE réussi, la propriété disparaît de la base et de GET /containers", async () => {
      const app = createGatewayApp();
      const a = await inscrireUtilisateurTest(app, "a.del@example.com", "motdepasse12");
      const id = await creerConteneurViaPasserelle(app, a.jeton);

      const avant = await prisma.containerOwnership.count({
        where: { userId: a.idUtilisateur, containerId: id },
      });
      expect(avant).toBe(1);

      const suppr = await app.request(`${ORIGINE}/containers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${a.jeton}` },
      });
      expect(suppr.status).toBe(204);

      const apres = await prisma.containerOwnership.count({
        where: { userId: a.idUtilisateur, containerId: id },
      });
      expect(apres).toBe(0);

      const liste = await app.request(`${ORIGINE}/containers`, {
        headers: { Authorization: `Bearer ${a.jeton}` },
      });
      const corps = (await liste.json()) as { containers: unknown[] };
      expect(corps.containers).toEqual([]);
    });

    it("nouvelle instance passerelle : ownerships et JWT inchangés", async () => {
      const app1 = createGatewayApp();
      const a = await inscrireUtilisateurTest(app1, "a.pers@example.com", "motdepasse12");
      const id = await creerConteneurViaPasserelle(app1, a.jeton);

      const app2 = createGatewayApp();
      const liste = await app2.request(`${ORIGINE}/containers`, {
        headers: { Authorization: `Bearer ${a.jeton}` },
      });
      expect(liste.status).toBe(200);
      const corps = (await liste.json()) as { containers: Array<{ id: string }> };
      expect(corps.containers.map((c) => c.id)).toEqual([id]);
    });

    it("flux SSE logs : propriétaire reçoit des événements ; autre utilisateur reçoit 403 JSON", async () => {
      const app = createGatewayApp();
      const a = await inscrireUtilisateurTest(app, "a.sse@example.com", "motdepasse12");
      const b = await inscrireUtilisateurTest(app, "b.sse@example.com", "motdepasse12");
      const idA = await creerConteneurViaPasserelle(app, a.jeton);
      await creerConteneurViaPasserelle(app, b.jeton);

      const refus = await app.request(`${ORIGINE}/containers/${idA}/logs/stream`, {
        headers: { Authorization: `Bearer ${b.jeton}` },
      });
      await assertAccesConteneurRefuse(refus);
      expect(refus.headers.get("content-type") ?? "").toContain("application/json");

      const fluxOk = await app.request(`${ORIGINE}/containers/${idA}/logs/stream`, {
        headers: { Authorization: `Bearer ${a.jeton}` },
      });
      expect(fluxOk.status).toBe(200);
      expect(fluxOk.headers.get("content-type") ?? "").toContain("text/event-stream");
      const lecteur = fluxOk.body!.getReader();
      const decodeur = new TextDecoder();
      let tampon = "";
      const echeance = Date.now() + 8000;
      while (Date.now() < echeance && !tampon.includes("ping-mock")) {
        const { value, done } = await lecteur.read();
        if (done) {
          break;
        }
        tampon += decodeur.decode(value, { stream: true });
      }
      await lecteur.cancel();
      expect(tampon).toContain("ping-mock");
    });

    it("abandon client sur flux SSE : le mock ne conserve pas de flux ouverts", async () => {
      const app = createGatewayApp();
      const a = await inscrireUtilisateurTest(app, "a.abort@example.com", "motdepasse12");
      const id = await creerConteneurViaPasserelle(app, a.jeton);

      const controleur = new AbortController();
      const reponse = await app.request(`${ORIGINE}/containers/${id}/logs/stream`, {
        headers: { Authorization: `Bearer ${a.jeton}` },
        signal: controleur.signal,
      });
      expect(reponse.status).toBe(200);
      const lecteur = reponse.body!.getReader();
      await lecteur.read();
      controleur.abort();
      try {
        for (;;) {
          const { done } = await lecteur.read();
          if (done) {
            break;
          }
        }
      } catch {
        /* annulation attendue */
      }
      await new Promise((r) => setTimeout(r, 150));
      expect(etatMoteur.fluxSseOuverts).toBe(0);
    });

    it("flux SSE se termine proprement quand le moteur ferme le flux (conteneur arrêté simulé)", async () => {
      const app = createGatewayApp();
      const a = await inscrireUtilisateurTest(app, "a.court@example.com", "motdepasse12");
      const id = await creerConteneurViaPasserelle(app, a.jeton);
      etatMoteur.idsFluxSseCourt.add(id);

      const reponse = await app.request(`${ORIGINE}/containers/${id}/logs/stream`, {
        headers: { Authorization: `Bearer ${a.jeton}` },
      });
      expect(reponse.status).toBe(200);
      const fluxCorps = reponse.body;
      if (fluxCorps === null) {
        throw new Error("Réponse SSE sans corps de flux.");
      }
      const lecteur = fluxCorps.getReader();
      const premierChunk = await lecteur.read();
      expect(premierChunk.done).toBe(false);
      if (premierChunk.value === undefined) {
        throw new Error("Premier fragment SSE vide.");
      }
      expect(new TextDecoder().decode(premierChunk.value)).toContain("ping-mock");
      const fin = await lecteur.read();
      expect(fin.done).toBe(true);
      expect(etatMoteur.fluxSseOuverts).toBe(0);
    });

  },
);
