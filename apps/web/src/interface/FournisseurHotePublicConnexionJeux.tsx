import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { chargerHotePublicConnexionJeuxPasserelle } from "../passerelle/chargerHotePublicConnexionJeuxPasserelle.js";

const CLE_STOCKAGE_PREFERER_NAVIGATEUR =
  "kp:hote-public-prefere-hote-navigateur";

type ContexteHotePublicConnexionJeux = {
  /** IP ou DNS configuré sur la passerelle (`GATEWAY_PUBLIC_HOST_FOR_CLIENTS`), sinon null. */
  hotePublicPourJeux: string | null;
  /**
   * Lorsque `true`, le panel ignore l’hôte renvoyé par la passerelle pour les libellés « connexion jeu »
   * et utilise systématiquement le hostname de la page (utile en LAN quand la passerelle a détecté
   * l’IP publique du FAI mais que les joueurs se connectent via une IP locale).
   * Persistant via `localStorage` et synchronisé entre onglets.
   */
  prefererHoteNavigateur: boolean;
  /** Met à jour la préférence ci-dessus (le composant racine se charge de la persistance). */
  definirPrefererHoteNavigateur: (valeur: boolean) => void;
};

const Contexte = createContext<ContexteHotePublicConnexionJeux | null>(null);

function lireValeurPersistantePrefererNavigateur(): boolean {
  if (typeof globalThis.window === "undefined") {
    return false;
  }
  try {
    const v = globalThis.window.localStorage.getItem(CLE_STOCKAGE_PREFERER_NAVIGATEUR);
    return v === "1" || v === "true";
  } catch {
    return false;
  }
}

function ecrireValeurPersistantePrefererNavigateur(valeur: boolean): void {
  if (typeof globalThis.window === "undefined") {
    return;
  }
  try {
    if (valeur) {
      globalThis.window.localStorage.setItem(CLE_STOCKAGE_PREFERER_NAVIGATEUR, "1");
    } else {
      globalThis.window.localStorage.removeItem(CLE_STOCKAGE_PREFERER_NAVIGATEUR);
    }
  } catch {
    /* ignorer (mode privé / quota dépassé) */
  }
}

/**
 * Fournit l’hôte public optionnel renvoyé par la passerelle pour les libellés « connexion jeu »
 * sans dépendre du hostname du navigateur, ainsi qu’une bascule utilisateur pour forcer l’affichage
 * de l’hôte du navigateur (test LAN).
 */
export function FournisseurHotePublicConnexionJeux({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [hotePublicPourJeux, setHotePublicPourJeux] = useState<string | null>(
    null,
  );
  const [prefererHoteNavigateur, setPrefererHoteNavigateurEtat] =
    useState<boolean>(lireValeurPersistantePrefererNavigateur);

  useEffect(() => {
    let annule = false;
    (async () => {
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
    })().catch(() => {});
    return () => {
      annule = true;
    };
  }, []);

  useEffect(() => {
    if (typeof globalThis.window === "undefined") {
      return;
    }
    const surChangementStockage = (ev: StorageEvent) => {
      if (ev.key !== CLE_STOCKAGE_PREFERER_NAVIGATEUR) {
        return;
      }
      setPrefererHoteNavigateurEtat(lireValeurPersistantePrefererNavigateur());
    };
    globalThis.window.addEventListener("storage", surChangementStockage);
    return () => globalThis.window.removeEventListener("storage", surChangementStockage);
  }, []);

  const definirPrefererHoteNavigateur = useCallback((valeur: boolean) => {
    ecrireValeurPersistantePrefererNavigateur(valeur);
    setPrefererHoteNavigateurEtat(valeur);
  }, []);

  const valeur = useMemo(
    () => ({
      hotePublicPourJeux,
      prefererHoteNavigateur,
      definirPrefererHoteNavigateur,
    }),
    [hotePublicPourJeux, prefererHoteNavigateur, definirPrefererHoteNavigateur],
  );

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
