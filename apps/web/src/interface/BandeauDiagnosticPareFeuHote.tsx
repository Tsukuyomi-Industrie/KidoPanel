import { useEffect, useState } from "react";
import {
  chargerDiagnosticPareFeuPasserelle,
  type DiagnosticPareFeuPanel,
} from "../passerelle/serviceDiagnosticPareFeuPasserelle.js";

const STYLE_BANDEAU: React.CSSProperties = {
  border:
    "1px solid var(--kp-couleur-bordure-attention, rgba(255, 200, 80, 0.55))",
  borderRadius: "0.5rem",
  padding: "0.6rem 0.75rem",
  fontSize: "0.85rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
  background: "rgba(255, 200, 80, 0.06)",
};

function libellePareFeu(diag: DiagnosticPareFeuPanel): string {
  if (diag.automatisationActivee === null) {
    return "État pare-feu hôte indéterminé";
  }
  if (!diag.automatisationActivee) {
    return "Ouverture automatique des ports désactivée";
  }
  if (diag.backendChoisi === null) {
    return "Aucun backend pare-feu actif";
  }
  return `Pare-feu hôte : ${diag.backendChoisi} actif`;
}

/**
 * Bandeau panel : affiche l’état du pare-feu hôte tel que vu par le moteur (firewalld / UFW).
 *
 * - Affiche un encadré d’aide francophone si l’ouverture automatique des ports n’est pas opérationnelle
 *   (firewalld inactif, sudo NOPASSWD manquant, etc.) — situation typique sur un poste de test où l’on
 *   crée des conteneurs mais où aucun port public ne s’ouvre tant que la configuration hôte n’est pas finalisée.
 * - Reste invisible quand la situation est nominale.
 *
 * `lieuAffichage` enrichit le titre pour préciser à quel endroit du panel l’aide s’affiche.
 */
export function BandeauDiagnosticPareFeuHote(props: Readonly<{
  /** Texte court (ex. « Réseaux privés ») prefixant le bandeau. Optionnel. */
  lieuAffichage?: string;
}>) {
  const [diag, setDiag] = useState<DiagnosticPareFeuPanel | null>(null);
  const [chargementTermine, setChargementTermine] = useState(false);

  useEffect(() => {
    let annule = false;
    (async () => {
      const r = await chargerDiagnosticPareFeuPasserelle();
      if (!annule) {
        setDiag(r);
        setChargementTermine(true);
      }
    })().catch(() => {});
    return () => {
      annule = true;
    };
  }, []);

  if (chargementTermine === false || diag === null) {
    return null;
  }
  const messageNonNominal = diag.messageDiagnostic.trim();
  if (messageNonNominal.length === 0) {
    return null;
  }
  const prefixeTitreAffichage =
    props.lieuAffichage === undefined ? "" : `${props.lieuAffichage} — `;
  const titre = `${prefixeTitreAffichage}${libellePareFeu(diag)}`;
  return (
    <output className="kp-bandeau-info kp-marges-haut-sm" style={STYLE_BANDEAU}>
      <strong>{titre}</strong>
      <span>{messageNonNominal}</span>
      <span className="kp-texte-muted">
        L’adresse de connexion affichée par le panel ne dépend pas du pare-feu :
        c’est l’ouverture des ports publiés (NAT box, firewalld, UFW) qui rend
        l’instance joignable depuis Internet ou le LAN. Pour tester localement
        sans toucher au pare-feu, connectez-vous à <span className="kp-cellule-mono">127.0.0.1</span>{" "}
        ou à l’IP LAN de la machine depuis le même réseau.
      </span>
    </output>
  );
}
