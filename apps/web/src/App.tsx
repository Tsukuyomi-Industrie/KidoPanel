import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { RoutesKidoPanel } from "./app/RoutesKidoPanel.js";
import "./App.css";
import "./interface/interface-kido-panel.css";

/**
 * Racine React : routage navigateur et feuille de style du panel authentifié.
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
    <BrowserRouter>
      <RoutesKidoPanel />
    </BrowserRouter>
  );
}
