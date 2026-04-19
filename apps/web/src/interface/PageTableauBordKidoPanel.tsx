import { useCallback, useEffect, useState } from "react";
import {
  chargerIndicateursTableauPasserelle,
  type IndicateursTableauPasserelle,
} from "../passerelle/serviceIndicateursPasserelle.js";
import {
  listerInstancesServeursJeuxPasserelle,
  type InstanceServeurJeuxPasserelle,
} from "../passerelle/serviceServeursJeuxPasserelle.js";
import { TableauBordPresentationKidoPanel } from "./TableauBordPresentationKidoPanel.js";

/**
 * Tableau de bord : agrège indicateurs passerelle et instances jeu pour la présentation métrique.
 */
export function PageTableauBordKidoPanel() {
  const [donnees, setDonnees] = useState<IndicateursTableauPasserelle | null>(null);
  const [instancesJeux, setInstancesJeux] = useState<InstanceServeurJeuxPasserelle[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const [indicateurs, listeJeux] = await Promise.all([
        chargerIndicateursTableauPasserelle(),
        listerInstancesServeursJeuxPasserelle().catch(() => [] as InstanceServeurJeuxPasserelle[]),
      ]);
      setDonnees(indicateurs);
      setInstancesJeux(listeJeux);
    } catch (error_) {
      setDonnees(null);
      setErreur(error_ instanceof Error ? error_.message : "Chargement des indicateurs impossible.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  return (
    <TableauBordPresentationKidoPanel
      donnees={donnees}
      instancesJeux={instancesJeux}
      chargement={chargement}
      erreur={erreur}
      surRecharger={charger}
    />
  );
}
