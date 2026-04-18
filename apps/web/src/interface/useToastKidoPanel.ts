import { useContext } from "react";
import { ToastKidoPanelContext, type ValeurToastKidoPanel } from "./toastKidoPanelContext.js";

/** Accès au déclenchement de toasts depuis les écrans du panel. */
export function useToastKidoPanel(): ValeurToastKidoPanel {
  const ctx = useContext(ToastKidoPanelContext);
  if (ctx === null) {
    throw new Error("useToastKidoPanel doit être utilisé sous FournisseurToastKidoPanel.");
  }
  return ctx;
}
