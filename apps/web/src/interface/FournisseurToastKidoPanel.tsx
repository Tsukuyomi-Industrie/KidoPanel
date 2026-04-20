import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ToastKidoPanelContext,
  type VarianteToastKidoPanel,
  type ValeurToastKidoPanel,
} from "./toastKidoPanelContext.js";

type EntreeToast = {
  id: string;
  message: string;
  variante: VarianteToastKidoPanel;
};

/**
 * Fournisseur léger : file de toasts empilés avec retrait automatique après quelques secondes.
 */
export function FournisseurToastKidoPanel({ children }: { readonly children: ReactNode }) {
  const [file, setFile] = useState<EntreeToast[]>([]);
  const retirerToastParId = useCallback((id: string) => {
    setFile((courant) => courant.filter((toastCourant) => toastCourant.id !== id));
  }, []);

  const pousserToast = useCallback((message: string, variante: VarianteToastKidoPanel) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    setFile((courant) => [...courant, { id, message, variante }]);
    globalThis.setTimeout(() => retirerToastParId(id), 5200);
  }, [retirerToastParId]);

  const valeur = useMemo<ValeurToastKidoPanel>(() => ({ pousserToast }), [pousserToast]);

  return (
    <ToastKidoPanelContext.Provider value={valeur}>
      {children}
      <div className="kp-toast-racine" aria-live="polite">
        {file.map((t) => (
          <div key={t.id} className={`kp-toast kp-toast--${t.variante}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastKidoPanelContext.Provider>
  );
}
