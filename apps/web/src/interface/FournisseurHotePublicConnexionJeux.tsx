import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { chargerHotePublicConnexionJeuxPasserelle } from "../passerelle/chargerHotePublicConnexionJeuxPasserelle.js";

type ContexteHotePublicConnexionJeux = {
  /** IP ou DNS configuré sur la passerelle (`GATEWAY_PUBLIC_HOST_FOR_CLIENTS`), sinon null. */
  hotePublicPourJeux: string | null;
};

const Contexte = createContext<ContexteHotePublicConnexionJeux | null>(null);

/**
 * Fournit l’hôte public optionnel renvoyé par la passerelle pour les libellés « connexion jeu » sans dépendre du hostname du navigateur.
 */
export function FournisseurHotePublicConnexionJeux({
  children,
}: {
  children: ReactNode;
}) {
  const [hotePublicPourJeux, setHotePublicPourJeux] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let annule = false;
    void (async () => {
      try {
        const lu = await chargerHotePublicConnexionJeuxPasserelle();
        if (!annule) {
          setHotePublicPourJeux(lu);
        }
      } catch {
        if (!annule) {
          setHotePublicPourJeux(null);
        }
      }
    })();
    return () => {
      annule = true;
    };
  }, []);

  const valeur = useMemo(() => ({ hotePublicPourJeux }), [hotePublicPourJeux]);

  return (
    <Contexte.Provider value={valeur}>{children}</Contexte.Provider>
  );
}

/** Accès au contexte : doit être utilisé sous la coque authentifiée. */
export function useHotePublicConnexionJeux(): ContexteHotePublicConnexionJeux {
  const valeur = useContext(Contexte);
  if (valeur === null) {
    throw new Error(
      "useHotePublicConnexionJeux doit être utilisé sous FournisseurHotePublicConnexionJeux.",
    );
  }
  return valeur;
}
