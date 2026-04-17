import { useCallback, useEffect, useState } from "react";
import {
  chargerIndicateursTableauPasserelle,
  type IndicateursTableauPasserelle,
} from "../passerelle/serviceIndicateursPasserelle.js";
import { TableauBordPresentationKidoPanel } from "./TableauBordPresentationKidoPanel.js";

type PropsPageTableauBordKidoPanel = {
  emailUtilisateur: string;
};

/**
 * Tableau de bord : charge les indicateurs passerelle et délègue l’affichage à la présentation dédiée.
 */
export function PageTableauBordKidoPanel({ emailUtilisateur }: PropsPageTableauBordKidoPanel) {
  const [donnees, setDonnees] = useState<IndicateursTableauPasserelle | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      setDonnees(await chargerIndicateursTableauPasserelle());
    } catch (e) {
      setDonnees(null);
      setErreur(e instanceof Error ? e.message : "Chargement des indicateurs impossible.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  return (
    <div className="kidopanel-page-centree">
      <TableauBordPresentationKidoPanel
        emailUtilisateur={emailUtilisateur}
        donnees={donnees}
        chargement={chargement}
        erreur={erreur}
        surRecharger={charger}
      />
    </div>
  );
}
