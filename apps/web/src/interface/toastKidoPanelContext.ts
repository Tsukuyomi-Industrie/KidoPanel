import { createContext } from "react";

export type VarianteToastKidoPanel = "succes" | "erreur" | "info";

export type ValeurToastKidoPanel = {
  pousserToast: (message: string, variante: VarianteToastKidoPanel) => void;
};

export const ToastKidoPanelContext = createContext<ValeurToastKidoPanel | null>(null);
