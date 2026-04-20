import { useCallback, useEffect, useRef, useState } from "react";
import { extraireEvenementsSseDepuisTampon } from "./flux-journaux-conteneur.parser-sse.js";
import { formaterErreurPourAffichagePanel } from "../lab/passerelleErreursAffichageLab.js";

export type OptionsFluxJournauxConteneur = {
  urlBasePasserelle: string;
  /** Identifiant dans l’URL du flux : id Docker (`coeurDocker`) ou id instance jeu (`instanceServeurJeu`). */
  idConteneur: string;
  jetonBearer: string;
  actif: boolean;
  /**
   * `instanceServeurJeu` : flux instances jeu ; `instanceWeb` : flux instances web ; sinon flux conteneur Docker classique.
   */
  varianteFlux?: "coeurDocker" | "instanceServeurJeu" | "instanceWeb";
  tailEntrees?: number;
  horodatageDocker?: boolean;
  lignesMaxAffichage?: number;
  /**
   * Appelé quand le flux SSE se termine normalement (fin Docker / conteneur arrêté), pour resynchroniser l’UI parente.
   * Mis à jour chaque rendu via une référence interne : ne pas s’appuyer sur l’identité de la fonction.
   */
  surFinFluxNaturelle?: () => void;
};

type EtatConnexion = "inactif" | "connecte" | "reconnexion" | "erreur";

const MAX_TENTATIVES_RECONNEXION = 8;

function delaiReconnexionMs(tentative: number): number {
  const base = 1000 * 2 ** Math.min(tentative, 5);
  return Math.min(base, 30_000);
}

/**
 * Consomme le flux SSE `GET /containers/:id/logs/stream` avec reconnexion exponentielle plafonnée.
 */
export function useFluxJournauxConteneur(
  options: OptionsFluxJournauxConteneur,
): {
  lignes: string[];
  etatConnexion: EtatConnexion;
  dernierMessageErreur: string | null;
  effacer: () => void;
} {
  const {
    urlBasePasserelle,
    idConteneur,
    jetonBearer,
    actif,
    varianteFlux = "coeurDocker",
    tailEntrees,
    horodatageDocker,
    lignesMaxAffichage = 5000,
    surFinFluxNaturelle,
  } = options;

  const refSurFinFluxNaturelle = useRef(surFinFluxNaturelle);
  refSurFinFluxNaturelle.current = surFinFluxNaturelle;

  const [lignes, setLignes] = useState<string[]>([]);
  const [etatConnexion, setEtatConnexion] = useState<EtatConnexion>("inactif");
  const [dernierMessageErreur, setDernierMessageErreur] = useState<string | null>(
    null,
  );
  const refTentatives = useRef(0);

  const effacer = useCallback(() => {
    setLignes([]);
  }, []);

  useEffect(() => {
    if (!actif || !jetonBearer.trim() || !idConteneur.trim()) {
      setEtatConnexion("inactif");
      return;
    }

    let executionAnnulee = false;
    let idTemporisation: ReturnType<typeof setTimeout> | undefined;
    let controleurAnnulation: AbortController | undefined;
    const relancerFluxApresAttente = (): void => {
      idTemporisation = undefined;
      etablirFlux().catch(() => {});
    };

    const programmerReconnexion = (): void => {
      if (executionAnnulee) {
        return;
      }
      if (refTentatives.current >= MAX_TENTATIVES_RECONNEXION) {
        setDernierMessageErreur(
          [
            "Flux journaux : trop de tentatives de reconnexion consécutives.",
            "Fermez puis rouvrez le flux, ou vérifiez la passerelle et le conteneur.",
          ].join("\n"),
        );
        setEtatConnexion("erreur");
        return;
      }
      refTentatives.current += 1;
      setEtatConnexion("reconnexion");
      if (idTemporisation !== undefined) {
        clearTimeout(idTemporisation);
      }
      const attente = delaiReconnexionMs(refTentatives.current);
      idTemporisation = setTimeout(relancerFluxApresAttente, attente);
    };

    const etablirFlux = async (): Promise<void> => {
      if (executionAnnulee) {
        return;
      }
      controleurAnnulation?.abort();
      controleurAnnulation = new AbortController();

      const base = urlBasePasserelle.replace(/\/$/, "");

      let cheminFlux = `${base}/containers/${encodeURIComponent(idConteneur)}/logs/stream`;
      if (varianteFlux === "instanceServeurJeu") {
        cheminFlux = `${base}/serveurs-jeux/instances/${encodeURIComponent(idConteneur)}/logs/stream`;
      } else if (varianteFlux === "instanceWeb") {
        cheminFlux = `${base}/web-instances/${encodeURIComponent(idConteneur)}/logs/stream`;
      }
      const url = new URL(cheminFlux);
      if (tailEntrees !== undefined) {
        url.searchParams.set("tail", String(tailEntrees));
      }
      if (horodatageDocker) {
        url.searchParams.set("timestamps", "true");
      }

      try {
        const urlFlux = url.toString();
        const reponse = await fetch(urlFlux, {
          method: "GET",
          mode: "cors",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${jetonBearer}`,
            Accept: "text/event-stream",
          },
          signal: controleurAnnulation.signal,
        });

        if (reponse.status === 401) {
          refTentatives.current = 0;
          setDernierMessageErreur("Authentification requise ou jeton invalide.");
          setEtatConnexion("erreur");
          return;
        }

        if (reponse.status === 403) {
          refTentatives.current = 0;
          setDernierMessageErreur("Accès au conteneur refusé.");
          setEtatConnexion("erreur");
          return;
        }

        if (!reponse.ok || !reponse.body) {
          let detailHttp = `HTTP ${reponse.status}`;
          if (reponse.statusText.trim() !== "") {
            detailHttp += ` ${reponse.statusText}`;
          }
          try {
            const corps = await reponse.clone().text();
            if (corps.trim() !== "") {
              detailHttp += `\n\nCorps de la réponse :\n${corps.slice(0, 4000)}`;
            }
          } catch {
            /* corps illisible */
          }
          setDernierMessageErreur(
            [
              "Flux journaux SSE : réponse refusée ou sans corps lisible.",
              "",
              `URL : ${urlFlux}`,
              "",
              detailHttp,
            ].join("\n"),
          );
          programmerReconnexion();
          return;
        }

        refTentatives.current = 0;
        setDernierMessageErreur(null);
        setEtatConnexion("connecte");
        setLignes([]);

        const lecteur = reponse.body.getReader();
        const decodeur = new TextDecoder();
        let tamponSse = "";
        let abandonSurEvenementErreurSse = false;

        lectureFlux: while (!executionAnnulee) {
          const { done, value } = await lecteur.read();
          if (done) {
            break lectureFlux;
          }
          tamponSse += decodeur.decode(value, { stream: true });
          const { tamponRestant, evenements } =
            extraireEvenementsSseDepuisTampon(tamponSse);
          tamponSse = tamponRestant;

          for (const ev of evenements) {
            if (ev.typeEvenement === "ping") {
              continue;
            }
            if (ev.typeEvenement === "error") {
              try {
                const parse = JSON.parse(ev.donnees) as { message?: string };
                setDernierMessageErreur(parse.message ?? ev.donnees);
              } catch {
                setDernierMessageErreur(ev.donnees);
              }
              abandonSurEvenementErreurSse = true;
              break lectureFlux;
            }
            try {
              const parse = JSON.parse(ev.donnees) as { line?: string };
              if (typeof parse.line === "string") {
                const ligneAjout = parse.line;
                setLignes((precedent) => {
                  const suite = [...precedent, ligneAjout];
                  if (suite.length > lignesMaxAffichage) {
                    return suite.slice(-lignesMaxAffichage);
                  }
                  return suite;
                });
              }
            } catch {
              /* événement hors format JSON : ignoré */
            }
          }
        }

        if (abandonSurEvenementErreurSse && !executionAnnulee) {
          refTentatives.current = 0;
          setEtatConnexion("erreur");
          refSurFinFluxNaturelle.current?.();
          return;
        }

        if (!executionAnnulee) {
          refTentatives.current = 0;
          setEtatConnexion("inactif");
          refSurFinFluxNaturelle.current?.();
        }
      } catch (error_) {
        if (executionAnnulee) {
          return;
        }
        if (
          error_ instanceof Error &&
          (error_.name === "AbortError" ||
            (typeof DOMException !== "undefined" &&
              error_ instanceof DOMException &&
              error_.name === "AbortError"))
        ) {
          return;
        }
        setDernierMessageErreur(
          formaterErreurPourAffichagePanel(
            error_,
            url.toString(),
            "flux SSE journaux conteneur",
          ),
        );
        programmerReconnexion();
      }
    };

    etablirFlux().catch(() => {});

    return () => {
      executionAnnulee = true;
      controleurAnnulation?.abort();
      if (idTemporisation !== undefined) {
        clearTimeout(idTemporisation);
      }
      refTentatives.current = 0;
    };
  }, [
    actif,
    jetonBearer,
    idConteneur,
    urlBasePasserelle,
    varianteFlux,
    tailEntrees,
    horodatageDocker,
    lignesMaxAffichage,
  ]);

  return { lignes, etatConnexion, dernierMessageErreur, effacer };
}
