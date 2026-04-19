import { useMemo } from "react";
import { useHotePublicConnexionJeux } from "../../interface/FournisseurHotePublicConnexionJeux.js";

function hostnameNavigateurLisible(): string {
  if (typeof globalThis.window === "undefined") {
    return "";
  }
  const h = globalThis.window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") {
    return "127.0.0.1";
  }
  return h;
}

/**
 * Bascule pour l’affichage « hôte : port » des serveurs de jeu :
 *
 * - Hôte public détecté par la passerelle (`GATEWAY_PUBLIC_HOST_FOR_CLIENTS`, valeur par défaut), utile en production.
 * - Hôte du navigateur (LAN), utile pour tester depuis un PC local quand la passerelle a détecté l’IP publique du FAI
 *   alors que vos clients se connectent par l’IP locale (ex. `192.168.x.x` / `10.x.x.x`).
 *
 * Le choix est persistant côté navigateur (`localStorage`) et n’affecte que l’affichage : il ne change
 * pas l’adresse réellement écoutée par les conteneurs ni la configuration de la passerelle.
 */
export function BasculeAffichageHotePublicConnexion() {
  const {
    hotePublicPourJeux,
    prefererHoteNavigateur,
    definirPrefererHoteNavigateur,
  } = useHotePublicConnexionJeux();
  const hoteNavigateur = useMemo(() => hostnameNavigateurLisible(), []);
  const aHotePublicConfigure =
    hotePublicPourJeux !== null && hotePublicPourJeux.trim().length > 0;
  const memeHoteAffiche =
    aHotePublicConfigure &&
    hoteNavigateur.length > 0 &&
    hoteNavigateur === hotePublicPourJeux?.trim();

  if (!aHotePublicConfigure || memeHoteAffiche || hoteNavigateur.length === 0) {
    return null;
  }

  const hoteEffectif = prefererHoteNavigateur ? hoteNavigateur : hotePublicPourJeux;

  return (
    <div
      className="kp-bandeau-info kp-marges-haut-sm"
      style={{
        border: "1px solid var(--kp-couleur-bordure-douce, rgba(255,255,255,0.12))",
        borderRadius: "0.5rem",
        padding: "0.55rem 0.7rem",
        fontSize: "0.82rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
      }}
    >
      <span>
        <strong>Adresse affichée pour les joueurs :</strong>{" "}
        <span className="kp-cellule-mono">{hoteEffectif}</span>
      </span>
      <label
        style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}
      >
        <input
          type="checkbox"
          checked={prefererHoteNavigateur}
          onChange={(e) => definirPrefererHoteNavigateur(e.target.checked)}
        />
        {" "}
        <span>
          Utiliser plutôt l’hôte du navigateur ({" "}
          <span className="kp-cellule-mono">{hoteNavigateur}</span>
          {")"}
          {" "}
          — pratique en LAN si la passerelle a détecté l’IP publique de votre FAI ({" "}
          <span className="kp-cellule-mono">{hotePublicPourJeux}</span>
          {")"}
          {" "}
          alors que vous testez depuis un autre poste du même réseau local.
        </span>
      </label>
      <span className="kp-texte-muted">
        N’affecte que l’affichage. Les conteneurs continuent d’écouter sur
        toutes les interfaces de la machine ; pour rendre l’adresse joignable
        depuis Internet, votre box / fournisseur doit ouvrir le port côté NAT.
      </span>
    </div>
  );
}
