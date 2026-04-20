function hoteUrlEstLoopback(urlComplete: string): boolean {
  try {
    const h = new URL(urlComplete).hostname.toLowerCase();
    return h === "127.0.0.1" || h === "localhost" || h === "[::1]";
  } catch {
    return false;
  }
}

function hoteUrlEgaleHotePage(urlComplete: string): boolean {
  if (globalThis.window === undefined) {
    return false;
  }
  try {
    return new URL(urlComplete).hostname === globalThis.window.location.hostname;
  } catch {
    return false;
  }
}

function hotePageEstLoopback(): boolean {
  if (globalThis.window === undefined) {
    return true;
  }
  const h = globalThis.window.location.hostname.toLowerCase();
  return h === "127.0.0.1" || h === "localhost" || h === "[::1]";
}

/** Indique que l’URL pointe vers le relais Vite (`vite.config.ts`) et non vers la passerelle en direct. */
function urlUtiliseProxyPasserelleDev(urlComplete: string): boolean {
  return urlComplete.includes("/__kidopanel_gateway");
}

/**
 * Explique une erreur « Failed to fetch » : le navigateur n’a pas obtenu de réponse HTTP exploitable
 * (réseau, URL, pare-feu, contenu mixte, CORS bloqué avant réponse, etc.).
 */
export function formaterErreurReseauFetch(
  urlComplete: string,
  erreur: unknown,
): string {
  const msg = erreur instanceof Error ? erreur.message : String(erreur);
  const verifs: string[] = [];

  if (urlUtiliseProxyPasserelleDev(urlComplete)) {
    verifs.push(
      "• Proxy Vite (`/__kidopanel_gateway`) : le navigateur parle au port du front (ex. 5173) ; c’est le processus Node de Vite qui doit joindre la passerelle HTTP (variable `VITE_GATEWAY_PROXY_TARGET` dans `apps/web/.env`, défaut `http://127.0.0.1:3000`). Sur la machine où tourne `pnpm --filter web dev`, exécutez : `curl -sSf http://127.0.0.1:3000/health`. Si échec : démarrer la passerelle (`pnpm --filter gateway dev` ou `pnpm --filter gateway start` après build ; ou script `infra/installer-panel-serveur.sh`). Le pare-feu WAN sur le port 3000 est inutile pour ce mode : tout est local à l’hôte.",
    );
  } else if (hoteUrlEstLoopback(urlComplete) && !hotePageEstLoopback()) {
    verifs.push(
      "• L’URL utilise 127.0.0.1 ou localhost : le navigateur contacte votre PC, pas le serveur. Ouvrez le panel avec l’IP ou le domaine du VPS (ex. http://IP:5173) : l’API suivra automatiquement http://IP:3000.",
    );
  } else if (hoteUrlEgaleHotePage(urlComplete)) {
    verifs.push(
      "• L’URL utilise le même hôte que la page : vérifier que la passerelle écoute sur le port attendu (3000 par défaut), ouvrir ce port si vous appelez l’API sans proxy, consulter `infra/logs/passerelle.log`.",
    );
  } else {
    verifs.push(
      "• Connectivité vers l’hôte et le port de l’URL ci-dessus (pare-feu, service démarré).",
    );
  }

  verifs.push(
    "• Page en HTTPS et API en HTTP : contenu mixte bloqué par le navigateur.",
    "• Après changement de code ou d’`.env` : redémarrer Vite (`pnpm dev`) ou rebuilder le front.",
  );

  return [
    "Impossible de joindre la passerelle (aucune réponse HTTP reçue).",
    "",
    `URL : ${urlComplete}`,
    `Message navigateur : ${msg}`,
    "",
    "Vérifications :",
    ...verifs,
  ].join("\n");
}

const MARQUEURS_MESSAGE_DEJA_ENRICHI = [
  "Impossible de joindre la passerelle",
  "Vérifications :",
] as const;

function messageErreurDejaEnrichiPourPanel(message: string): boolean {
  return MARQUEURS_MESSAGE_DEJA_ENRICHI.some((s) => message.includes(s));
}

/** Texte d’exception ou valeur arbitraire pour le bandeau sans `String` implicite sur objet complexe. */
function valeurArbitraireVersTexteErreurPanel(valeur: unknown): string {
  if (typeof valeur === "string") {
    return valeur;
  }
  if (typeof valeur === "number" || typeof valeur === "boolean") {
    return String(valeur);
  }
  if (valeur === null || valeur === undefined) {
    return "";
  }
  try {
    return JSON.stringify(valeur);
  } catch {
    return "";
  }
}

/** Libellés réseau vagues renvoyés par les navigateurs quand la requête échoue avant un corps HTTP lisible. */
const MOTIFS_ERREUR_RESEAU_GENERIQUE_NAVIGATEUR = [
  "Failed to fetch",
  "Load failed",
  "NetworkError when attempting to fetch resource",
  "Network request failed",
  "NetworkError",
  "La récupération a échoué",
  "L'accès réseau a échoué",
  "L’accès réseau a échoué",
  "Une erreur réseau s'est produite",
  "Une erreur réseau s’est produite",
  "Impossible de contacter le serveur",
  "Impossible de se connecter au serveur",
  "Réponse vide pour une requête",
  "Cross-Origin Request Blocked",
] as const;

export function estErreurReseauNavigateurGenerique(erreur: unknown): boolean {
  const msg = erreur instanceof Error ? erreur.message : valeurArbitraireVersTexteErreurPanel(erreur);
  const normalise = msg.replaceAll(/\s+/g, " ").trim();
  if (MOTIFS_ERREUR_RESEAU_GENERIQUE_NAVIGATEUR.some((g) => normalise.includes(g))) {
    return true;
  }
  return /failed\s+to\s+fetch/i.test(normalise);
}

/**
 * Dernière couche avant affichage : si le texte stocké ressemble encore à un échec réseau minimal,
 * on ajoute le bloc d’aide (utile si bundle obsolète, message localisé atypique ou corps HTTP très court).
 */
export function enrichirTexteErreurPourAffichage(
  texteBrut: string,
  urlContexteAbsolue: string,
): string {
  const t = texteBrut.trim();
  if (t.includes("Vérifications :")) {
    return texteBrut;
  }
  if (t.length > 2000) {
    return texteBrut;
  }
  const uneLigne = t.replaceAll(/\s+/g, " ");
  const ressembleEchecFetch =
    estErreurReseauNavigateurGenerique(new Error(uneLigne)) ||
    (/^typeerror\s*:/i.test(t) && /fetch|réseau|network|cors/i.test(t));
  if (!ressembleEchecFetch) {
    return texteBrut;
  }
  return [
    "— Message d’origine —",
    texteBrut.trim(),
    "",
    "— Aide diagnostic (contexte URL) —",
    formaterErreurReseauFetch(urlContexteAbsolue, new Error(uneLigne)),
  ].join("\n");
}

/**
 * Texte pour le bandeau d’erreur du panel : remplace « Failed to fetch » seul par l’aide complète,
 * et ajoute URL / action pour les autres exceptions (JSON, TypeError, etc.).
 */
export function formaterErreurPourAffichagePanel(
  erreur: unknown,
  urlComplete: string,
  libelleAction?: string,
): string {
  if (
    erreur instanceof Error &&
    messageErreurDejaEnrichiPourPanel(erreur.message)
  ) {
    return erreur.message;
  }
  if (estErreurReseauNavigateurGenerique(erreur)) {
    return formaterErreurReseauFetch(urlComplete, erreur);
  }
  const parties: string[] = [];
  if (libelleAction !== undefined && libelleAction !== "") {
    parties.push(`Action : ${libelleAction}`, "");
  }
  parties.push(`URL : ${urlComplete}`);
  if (erreur instanceof Error) {
    parties.push("", `${erreur.name} : ${erreur.message}`);
    if (erreur.cause instanceof Error) {
      parties.push(
        `Cause : ${erreur.cause.name} : ${erreur.cause.message}`,
      );
    }
  } else {
    parties.push("", valeurArbitraireVersTexteErreurPanel(erreur));
  }
  return parties.join("\n");
}
