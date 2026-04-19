import {
  effacerToutJetonPasserelle,
  enregistrerJetonDepuisLabPersistant,
  lireJetonPasserelle,
} from "../passerelle/jetonPasserelleStockage.js";
import { formaterErreurReseauFetch } from "./passerelleErreursAffichageLab.js";
import { urlBasePasserelle } from "../passerelle/url-base-passerelle.js";

export { urlBasePasserelle } from "../passerelle/url-base-passerelle.js";

/** Lit le jeton JWT stocké pour les appels à la passerelle. */
export function lireJetonStockage(): string {
  return lireJetonPasserelle();
}

/**
 * Efface ou enregistre le jeton depuis le lab : persistance locale typée ;
 * une chaîne vide supprime toutes les variantes connues.
 */
export function enregistrerJetonStockage(jeton: string): void {
  if (jeton.trim() === "") {
    effacerToutJetonPasserelle();
  } else {
    enregistrerJetonDepuisLabPersistant(jeton);
  }
}

/** Expose l’enregistrement post-connexion du panel principal (session ou persistance). */
export { enregistrerJetonApresAuthentificationPanel } from "../passerelle/jetonPasserelleStockage.js";

export type CorpsErreurPasserelle = {
  statutHttp: number;
  /** Libellé HTTP renvoyé par le navigateur (ex. « Not Found »), vide si absent. */
  libelleStatut?: string;
  texteBrut: string;
  jsonParse?: unknown;
};

/** Construit une représentation lisible d’une réponse HTTP en error_. */
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
    ...(libelleStatut === "" ? {} : { libelleStatut }),
    texteBrut,
    jsonParse,
  };
}

/** Formate une error_ HTTP pour affichage dans l’interface de test. */
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

/** Assemble l’URL absolue d’un chemin sur la passerelle (diagnostic d’error_). */
export function composerUrlPasserelle(cheminRelatif: string): string {
  const base = urlBasePasserelle();
  const chemin = cheminRelatif.startsWith("/")
    ? cheminRelatif
    : `/${cheminRelatif}`;
  return `${base}${chemin}`;
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
  } catch (error_) {
    throw new Error(formaterErreurReseauFetch(url, error_));
  }
}
