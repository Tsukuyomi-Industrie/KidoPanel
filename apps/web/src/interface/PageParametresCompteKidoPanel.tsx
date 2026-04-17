import { lireJetonStockage } from "../lab/passerelleClient.js";
import { extraireEmailDepuisJetonClient } from "../passerelle/lectureEmailJetonClient.js";

/**
 * Paramètres du compte : informations de session et sections réservées aux évolutions futures.
 */
export function PageParametresCompteKidoPanel() {
  const jeton = lireJetonStockage();
  const email = extraireEmailDepuisJetonClient(jeton);

  return (
    <div className="kidopanel-page-centree kidopanel-page-parametres">
      <h1 className="kidopanel-titre-page">Paramètres</h1>
      <p className="kidopanel-sous-titre-page">
        Gestion du compte et des préférences. Certaines actions avancées arriveront dans les prochaines
        itérations (changement de mot de passe, clés API, notifications).
      </p>

      <section className="kidopanel-carte-principale">
        <h2 className="kidopanel-titre-section">Profil</h2>
        <dl className="kidopanel-liste-definitions">
          <div>
            <dt>Adresse e-mail</dt>
            <dd>{email ?? "—"}</dd>
          </div>
          <div>
            <dt>Identifiant jeton</dt>
            <dd className="kidopanel-cellule-mono">
              {jeton.length > 24 ? `${jeton.slice(0, 18)}…` : jeton}
            </dd>
          </div>
        </dl>
      </section>

      <section className="kidopanel-carte-principale kidopanel-carte-muted">
        <h2 className="kidopanel-titre-section">Sécurité du compte</h2>
        <p className="kidopanel-texte-muted">
          Le changement de mot de passe et la révocation des sessions nécessitent des routes dédiées côté
          passerelle : non disponibles pour l’instant dans cette version du panel.
        </p>
      </section>

      <section className="kidopanel-carte-principale kidopanel-carte-muted">
        <h2 className="kidopanel-titre-section">Préférences d’interface</h2>
        <p className="kidopanel-texte-muted">
          Thèmes additionnels, langue régionale et densité d’affichage seront proposés ici.
        </p>
      </section>
    </div>
  );
}
