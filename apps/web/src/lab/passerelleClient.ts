/** URL de base de la passerelle (variable Vite `VITE_GATEWAY_BASE_URL`, sans slash final). */
export function urlBasePasserelle(): string {
  const brute = import.meta.env.VITE_GATEWAY_BASE_URL?.trim();
  if (brute && brute.length > 0) {
    return brute.replace(/\/$/, "");
  }
  return "http://127.0.0.1:3000";
}

const CLE_JWT_LAB = "kido-panel-lab-jwt";

/** Lit le jeton JWT stocké pour les appels à la passerelle. */
export function lireJetonStockage(): string {
  try {
    return localStorage.getItem(CLE_JWT_LAB) ?? "";
  } catch {
    return "";
  }
}

/** Enregistre ou efface le jeton JWT (chaîne vide supprime la clé). */
export function enregistrerJetonStockage(jeton: string): void {
  try {
    if (jeton.trim() === "") {
      localStorage.removeItem(CLE_JWT_LAB);
    } else {
      localStorage.setItem(CLE_JWT_LAB, jeton);
    }
  } catch {
    /* stockage indisponible : l’appelant peut saisir le jeton en session uniquement */
  }
}

export type CorpsErreurPasserelle = {
  statutHttp: number;
  /** Libellé HTTP renvoyé par le navigateur (ex. « Not Found »), vide si absent. */
  libelleStatut?: string;
  texteBrut: string;
  jsonParse?: unknown;
};

/** Construit une représentation lisible d’une réponse HTTP en erreur. */
export async function corpsErreurDepuisReponse(
  reponse: Response,
): Promise<CorpsErreurPasserelle> {
  const texteBrut = await reponse.text();
  let jsonParse: unknown;
  try {
    jsonParse = JSON.parse(texteBrut) as unknown;
  } catch {
    /* corps non JSON */
  }
  const libelleStatut = reponse.statusText.trim();
  return {
    statutHttp: reponse.status,
    ...(libelleStatut !== "" ? { libelleStatut } : {}),
    texteBrut,
    jsonParse,
  };
}

/** Formate une erreur HTTP pour affichage dans l’interface de test. */
export function formaterErreurAffichage(corps: CorpsErreurPasserelle): string {
  const enteteStatut =
    corps.libelleStatut !== undefined && corps.libelleStatut !== ""
      ? `HTTP ${corps.statutHttp} ${corps.libelleStatut}`
      : `HTTP ${corps.statutHttp}`;
  const lignes = [enteteStatut];
  if (corps.jsonParse !== undefined) {
    lignes.push(JSON.stringify(corps.jsonParse, null, 2));
  } else if (corps.texteBrut.trim() !== "") {
    lignes.push(corps.texteBrut);
  }
  return lignes.join("\n");
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
  return [
    "Impossible de joindre la passerelle (aucune réponse HTTP reçue).",
    "",
    `URL : ${urlComplete}`,
    `Message navigateur : ${msg}`,
    "",
    "Vérifications :",
    "• Depuis un autre PC que le VPS : dans apps/web/.env, VITE_GATEWAY_BASE_URL doit être l’URL publique (ex. http://IP_OU_DOMAINE:3000), pas http://127.0.0.1:3000.",
    "• Pare-feu : port 3000 ouvert (ufw / firewalld + panneau de l’hébergeur).",
    "• Passerelle active : voir infra/logs/passerelle.log sur le serveur.",
    "• Page en HTTPS qui appelle une API en HTTP : le navigateur bloque (contenu mixte).",
    "• Après mise à jour du code : rebuild (pnpm run build) et redémarrage des services.",
  ].join("\n");
}

const MARQUEURS_MESSAGE_DEJA_ENRICHI = [
  "Impossible de joindre la passerelle",
  "Vérifications :",
] as const;

function messageErreurDejaEnrichiPourPanel(message: string): boolean {
  return MARQUEURS_MESSAGE_DEJA_ENRICHI.some((s) => message.includes(s));
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
  const msg = erreur instanceof Error ? erreur.message : String(erreur);
  const normalise = msg.replace(/\s+/g, " ").trim();
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
  const uneLigne = t.replace(/\s+/g, " ");
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

/** Assemble l’URL absolue d’un chemin sur la passerelle (diagnostic d’erreur). */
export function composerUrlPasserelle(cheminRelatif: string): string {
  const base = urlBasePasserelle();
  const chemin = cheminRelatif.startsWith("/")
    ? cheminRelatif
    : `/${cheminRelatif}`;
  return `${base}${chemin}`;
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
    parties.push("", String(erreur));
  }
  return parties.join("\n");
}

/** Indique si GET /health répond ; utile pour diagnostiquer avant login. */
export async function sondageSantePasserelle(): Promise<{
  joignable: boolean;
  message: string;
}> {
  const url = `${urlBasePasserelle()}/health`;
  try {
    const reponse = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
    });
    if (reponse.ok) {
      return {
        joignable: true,
        message: `Passerelle joignable — ${url} (HTTP ${reponse.status})`,
      };
    }
    return {
      joignable: false,
      message: [
        `La passerelle répond mais /health n’est pas OK.`,
        `URL : ${url}`,
        `HTTP ${reponse.status}`,
        "Le moteur Docker est peut-être arrêté ou injoignable (voir infra/logs/moteur.log).",
      ].join("\n"),
    };
  } catch (erreur) {
    return {
      joignable: false,
      message: formaterErreurReseauFetch(url, erreur),
    };
  }
}

type OptionsAppel = RequestInit & {
  /** Surcharge du jeton (sinon lecture du stockage local). */
  jetonBearer?: string;
};

/** Effectue une requête HTTP vers la passerelle avec en-tête Authorization si un jeton est disponible. */
export async function appelerPasserelle(
  cheminRelatif: string,
  options: OptionsAppel = {},
): Promise<Response> {
  const base = urlBasePasserelle();
  const chemin = cheminRelatif.startsWith("/")
    ? cheminRelatif
    : `/${cheminRelatif}`;
  const url = `${base}${chemin}`;
  const { jetonBearer, headers: enTetesInitiaux, ...reste } = options;
  const enTetes = new Headers(enTetesInitiaux);
  if (reste.body !== undefined && !enTetes.has("Content-Type")) {
    enTetes.set("Content-Type", "application/json");
  }
  const jeton = jetonBearer ?? lireJetonStockage();
  if (jeton.trim() !== "") {
    enTetes.set("Authorization", `Bearer ${jeton}`);
  }
  try {
    return await fetch(url, {
      ...reste,
      headers: enTetes,
      mode: "cors",
      cache: "no-store",
    });
  } catch (erreur) {
    throw new Error(formaterErreurReseauFetch(url, erreur));
  }
}
