import { useMemo } from "react";
import {
  enrichirTexteErreurPourAffichage,
} from "../lab/passerelleErreursAffichageLab.js";

type PropsBandeauErreurPasserelleKidoPanel = {
  readonly messageErreur: string | null;
  readonly refUrlContexteErreur: { readonly current: string };
};

/**
 * Affiche uniquement les erreurs passerelle contextualisées, sans sonde de santé HTTP.
 */
export function BandeauErreurPasserelleKidoPanel({
  messageErreur,
  refUrlContexteErreur,
}: PropsBandeauErreurPasserelleKidoPanel) {
  const texte = useMemo(() => {
    if (messageErreur === null || messageErreur === "") {
      return null;
    }
    return enrichirTexteErreurPourAffichage(messageErreur, refUrlContexteErreur.current);
  }, [messageErreur, refUrlContexteErreur]);

  if (texte === null) {
    return null;
  }

  return (
    <div className="kp-erreur-passerelle" role="alert">
      <strong className="kp-erreur-passerelle__titre">Erreur</strong>
      <pre className="kp-erreur-passerelle__corps">{texte}</pre>
    </div>
  );
}
