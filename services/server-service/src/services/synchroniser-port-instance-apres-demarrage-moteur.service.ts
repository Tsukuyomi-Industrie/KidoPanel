import type { GameServerInstance } from "@kidopanel/database";
import type { DepotInstanceServeur } from "../repositories/depot-instance-serveur.repository.js";
import type { ClientMoteurConteneursHttp } from "./client-moteur-conteneurs-http.service.js";
import { resoudreGabaritJeuPourType } from "./mappage-gabarit-type-jeu.service.js";

type PortResumeMoteur = {
  privatePort: number;
  publicPort?: number;
  type: string;
};

function normaliserIdConteneurCompare(id: string): string {
  return id.replace(/^sha256:/i, "").toLowerCase();
}

function protocoleReseauParDefautPourGabaritId(
  gabaritId: string,
): "tcp" | "udp" {
  if (
    gabaritId === "tmpl-jeu-minecraft-bedrock" ||
    gabaritId === "tmpl-jeu-valheim"
  ) {
    return "udp";
  }
  return "tcp";
}

/**
 * Indique si l’identifiant issu de `docker ps` (souvent tronqué) correspond à l’id stocké côté Prisma.
 */
function identifiantsConteneurCorrespondent(
  idListe: string,
  idReference: string,
): boolean {
  const a = normaliserIdConteneurCompare(idListe);
  const b = normaliserIdConteneurCompare(idReference);
  return a === b || a.startsWith(b) || b.startsWith(a);
}

/**
 * Interroge le moteur après un démarrage : enregistre le port TCP hôte alloué pour le port applicatif du gabarit (liaison hôte `0`).
 */
export async function synchroniserPortInstanceApresDemarrageSurMoteur(params: {
  depot: DepotInstanceServeur;
  clientMoteur: ClientMoteurConteneursHttp;
  ligne: GameServerInstance;
  identifiantRequeteHttp: string;
}): Promise<GameServerInstance> {
  const idDocker = params.ligne.containerId?.trim();
  if (idDocker === undefined || idDocker.length === 0) {
    return params.ligne;
  }
  const gabarit = resoudreGabaritJeuPourType(params.ligne.gameType);
  const portPriveJeu = gabarit.defaultPorts[0];
  const protocoleAttendu = protocoleReseauParDefautPourGabaritId(gabarit.id);
  if (portPriveJeu === undefined) {
    return params.ligne;
  }

  let reponseListe: Response;
  try {
    reponseListe = await params.clientMoteur.listerConteneursDiagnostic({
      inclureArretes: true,
      identifiantRequete: params.identifiantRequeteHttp,
    });
  } catch {
    return params.ligne;
  }

  const texte = await reponseListe.text();
  if (!reponseListe.ok) {
    return params.ligne;
  }

  let parse: unknown;
  try {
    parse = JSON.parse(texte) as unknown;
  } catch {
    return params.ligne;
  }
  if (
    typeof parse !== "object" ||
    parse === null ||
    !("containers" in parse) ||
    !Array.isArray((parse as { containers: unknown }).containers)
  ) {
    return params.ligne;
  }

  const conteneurs = (parse as { containers: Array<{ id: string; ports: PortResumeMoteur[] }> })
    .containers;
  const entree = conteneurs.find((c) =>
    identifiantsConteneurCorrespondent(c.id, idDocker),
  );
  if (entree === undefined) {
    return params.ligne;
  }

  const pub = entree.ports.find(
    (p) =>
      p.type.toLowerCase() === protocoleAttendu &&
      p.privatePort === portPriveJeu &&
      typeof p.publicPort === "number",
  );
  if (pub?.publicPort === undefined) {
    return params.ligne;
  }

  return params.depot.mettreAJour(params.ligne.id, { port: pub.publicPort });
}
