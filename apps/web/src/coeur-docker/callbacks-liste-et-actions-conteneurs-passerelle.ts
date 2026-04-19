import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { appelerPasserelle, composerUrlPasserelle } from "../lab/passerelleClient.js";
import { formaterErreurPourAffichagePanel } from "../lab/passerelleErreursAffichageLab.js";
import type { ResumeConteneurLab } from "../lab/typesConteneurLab.js";
import {
  appliquerEtatOptimisteLifecycleSurListe,
  bouclerResynchronisationListeApresLifecycle,
} from "./resynchronisation-liste-apres-action-conteneur.js";

type ParamsCallbacksListeEtActions = {
  refUrlContexteErreur: MutableRefObject<string>;
  afficherErreurSiBesoin: (reponse: Response) => Promise<boolean>;
  setConteneurs: Dispatch<SetStateAction<ResumeConteneurLab[]>>;
  setMessageErreur: Dispatch<SetStateAction<string | null>>;
  setChargementListe: Dispatch<SetStateAction<boolean>>;
};

/**
 * Factorise lecture liste et mutations start/stop/delete pour garder le provider sous la limite de lignes du projet.
 */
export function creerCallbacksListeEtActionsConteneurs({
  refUrlContexteErreur,
  afficherErreurSiBesoin,
  setConteneurs,
  setMessageErreur,
  setChargementListe,
}: ParamsCallbacksListeEtActions): {
  telechargerListeConteneursSansChargement: () => Promise<ResumeConteneurLab[] | null>;
  rafraichirListe: () => Promise<void>;
  actionConteneur: (
    id: string,
    methode: "POST" | "DELETE",
    cheminSuffixe: string,
  ) => Promise<void>;
} {
  const telechargerListeConteneursSansChargement = async (): Promise<
    ResumeConteneurLab[] | null
  > => {
    refUrlContexteErreur.current = composerUrlPasserelle("/containers");
    const reponse = await appelerPasserelle("/containers", { method: "GET" });
    if (!(await afficherErreurSiBesoin(reponse))) {
      return null;
    }
    const donnees = (await reponse.json()) as {
      containers?: ResumeConteneurLab[];
    };
    return Array.isArray(donnees.containers) ? donnees.containers : [];
  };

  const rafraichirListe = async (): Promise<void> => {
    setChargementListe(true);
    setMessageErreur(null);
    try {
      const liste = await telechargerListeConteneursSansChargement();
      if (liste !== null) {
        setConteneurs(liste);
      }
    } catch (error_) {
      setMessageErreur(
        formaterErreurPourAffichagePanel(
          error_,
          composerUrlPasserelle("/containers"),
          "liste des instances",
        ),
      );
    } finally {
      setChargementListe(false);
    }
  };

  const actionConteneur = async (
    id: string,
    methode: "POST" | "DELETE",
    cheminSuffixe: string,
  ): Promise<void> => {
    setMessageErreur(null);
    try {
      refUrlContexteErreur.current = composerUrlPasserelle(
        `/containers/${encodeURIComponent(id)}${cheminSuffixe}`,
      );
      const reponse = await appelerPasserelle(
        `/containers/${encodeURIComponent(id)}${cheminSuffixe}`,
        { method: methode },
      );
      if (!(await afficherErreurSiBesoin(reponse))) {
        return;
      }
      if (
        methode === "POST" &&
        (cheminSuffixe === "/stop" || cheminSuffixe === "/start")
      ) {
        setConteneurs((prev) =>
          appliquerEtatOptimisteLifecycleSurListe(prev, id, cheminSuffixe),
        );
        await bouclerResynchronisationListeApresLifecycle({
          suffixe: cheminSuffixe,
          idConteneur: id,
          telechargerListe: telechargerListeConteneursSansChargement,
          majListe: setConteneurs,
        });
        return;
      }
      await rafraichirListe();
    } catch (error_) {
      setMessageErreur(
        formaterErreurPourAffichagePanel(
          error_,
          composerUrlPasserelle(
            `/containers/${encodeURIComponent(id)}${cheminSuffixe}`,
          ),
          "action sur une instance",
        ),
      );
    }
  };

  return {
    telechargerListeConteneursSansChargement,
    rafraichirListe,
    actionConteneur,
  };
}
