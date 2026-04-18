import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { RoutesKidoPanel } from "./app/RoutesKidoPanel.js";
import { FournisseurToastKidoPanel } from "./interface/FournisseurToastKidoPanel.js";
import "./App.css";
import "./interface/interface-kido-panel-primitives.css";
import "./interface/interface-kido-panel-statuts-feedback.css";
import "./interface/interface-kido-panel-mise-en-page.css";
import "./interface/interface-kido-panel-serveurs-console.css";
import "./interface/interface-kido-panel.css";
import "./interface/interface-kido-panel-composants.css";
import "./interface/interface-kido-panel-coque.css";
import "./interface/interface-kido-panel-coque-responsive.css";
import "./interface/interface-kido-panel-tableau.css";
import "./interface/interface-kido-panel-journaux.css";
import "./interface/interface-kido-panel-creation.css";
import "./interface/interface-kido-panel-assistant-instance.css";

/**
 * Racine React : routing navigateur, file de toasts et feuilles de style du panel authentifié.
 */
export default function App() {
  useEffect(() => {
    const racine = document.getElementById("root");
    racine?.classList.add("racine-kidopanel");
    return () => {
      racine?.classList.remove("racine-kidopanel");
    };
  }, []);

  return (
    <FournisseurToastKidoPanel>
      <BrowserRouter>
        <RoutesKidoPanel />
      </BrowserRouter>
    </FournisseurToastKidoPanel>
  );
}
