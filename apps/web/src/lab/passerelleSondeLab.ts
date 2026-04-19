import { urlBasePasserelle } from "./passerelleClient.js";
import { formaterErreurReseauFetch } from "./passerelleErreursAffichageLab.js";

/** Extrait un libellé lisible du corps JSON 502 UPSTREAM de la passerelle. */
async function detailCorpsHealthEchoue(reponse: Response): Promise<string> {
  try {
    const brut = await reponse.clone().text();
    if (brut.trim() === "") {
      return "";
    }
    const parse = JSON.parse(brut) as {
      error?: { code?: string; message?: string };
    };
    if (
      parse.error?.code === "UPSTREAM_UNAVAILABLE" &&
      typeof parse.error.message === "string"
    ) {
      return parse.error.message;
    }
    return brut.length > 800 ? `${brut.slice(0, 800)}…` : brut;
  } catch {
    return "";
  }
}

/** Indique si GET /health répond ; utile pour diagnostiquer avant login. */
export async function sondageSantePasserelle(): Promise<{
  joignable: boolean;
  message: string;
}> {
  const base = urlBasePasserelle();
  const urlPasserelleSeule = `${base}/health/gateway`;
  const urlHealthComplet = `${base}/health`;

  try {
    const reponsePasserelle = await fetch(urlPasserelleSeule, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
    });
    if (!reponsePasserelle.ok) {
      const lignes = [
        "La requête vers la passerelle via le proxy Vite a échoué.",
        `URL : ${urlPasserelleSeule}`,
        `HTTP ${reponsePasserelle.status}`,
      ];
      if (reponsePasserelle.status === 502) {
        lignes.push(
          "",
          "502 via le proxy Vite : la cible http://127.0.0.1:3000 est injoignable depuis le processus Vite (passerelle arrêtée, build obsolète, ou port occupé). Retirer `VITE_GATEWAY_DEV_USE_PROXY` du `.env` web pour appeler directement le port 3000 sur l’hôte de la page (ouvrir le 3000 sur le pare-feu si besoin). Journal : infra/logs/passerelle.log.",
        );
      }
      return {
        joignable: false,
        message: lignes.join("\n"),
      };
    }
  } catch (error_) {
    return {
      joignable: false,
      message: formaterErreurReseauFetch(urlPasserelleSeule, error_),
    };
  }

  try {
    const reponse = await fetch(urlHealthComplet, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
    });
    if (reponse.ok) {
      return {
        joignable: true,
        message: `Passerelle et moteur OK — ${urlHealthComplet} (HTTP ${reponse.status})`,
      };
    }
    const detail = await detailCorpsHealthEchoue(reponse);
    return {
      joignable: false,
      message: [
        "La passerelle répond ; le container-engine (Docker) ne répond pas sur /health.",
        `URL testée : ${urlHealthComplet}`,
        `HTTP ${reponse.status}`,
        "",
        "Côté serveur : démarrer le processus container-engine (port 8787 par défaut, variable racine CONTAINER_ENGINE_BASE_URL pour la passerelle).",
        "Journal : infra/logs/moteur.log",
        ...(detail === "" ? [] : ["", `Détail passerelle : ${detail}`]),
      ].join("\n"),
    };
  } catch (error_) {
    return {
      joignable: false,
      message: formaterErreurReseauFetch(urlHealthComplet, error_),
    };
  }
}
