import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

/** Monte l’application React sur l’élément `#root` du document. */
const racineApplication = document.getElementById("root");
if (racineApplication === null) {
  throw new Error("Élément #root introuvable : impossible de monter le panel.");
}
createRoot(racineApplication).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
