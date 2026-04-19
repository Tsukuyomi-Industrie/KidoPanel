import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  listeGabaritsDockerRapide,
  trouverGabaritDockerRapideParId,
} from "@kidopanel/container-catalog";
import { FormulaireGabarit } from "../interface/FormulaireGabarit.js";
import { creerWebInstancePasserelle } from "../passerelle/serviceWebInstancesPasserelle.js";
import { useToastKidoPanel } from "../interface/useToastKidoPanel.js";

type EtapeCreation = 1 | 2;

type ChoixPile =
  | "NGINX_STATIC"
  | "NODE_JS"
  | "PHP_FPM"
  | "CUSTOM_RAPIDE";

const CARTES_PILE: Array<{
  id: ChoixPile;
  titre: string;
  detail: string;
  techApi: string;
  gabaritId?: string;
}> = [
  {
    id: "NGINX_STATIC",
    titre: "Nginx — site statique",
    detail: "Serveur HTTP pour fichiers statiques ou reverse proxy.",
    techApi: "NGINX_STATIC",
  },
  {
    id: "NODE_JS",
    titre: "Node.js — application",
    detail: "API ou front Node ; commande neutre par défaut pour rester actif.",
    techApi: "NODE_JS",
  },
  {
    id: "PHP_FPM",
    titre: "PHP — FPM",
    detail: "Runtime PHP-FPM pour applications PHP modernes.",
    techApi: "PHP_FPM",
  },
  {
    id: "CUSTOM_RAPIDE",
    titre: "Personnalisé (catalogue)",
    detail: "Choisir un gabarit Docker rapide (Postgres, Redis, etc.).",
    techApi: "CUSTOM",
  },
];

/**
 * Assistant deux étapes : pile technique puis formulaire gabarit aligné catalogue.
 */
export function PageCreationWebInstance() {
  const navigate = useNavigate();
  const { pousserToast } = useToastKidoPanel();
  const [etape, setEtape] = useState<EtapeCreation>(1);
  const [pile, setPile] = useState<(typeof CARTES_PILE)[number] | null>(null);
  const [gabaritPersoId, setGabaritPersoId] = useState("rapide-nginx");
  const [domaineOptionnel, setDomaineOptionnel] = useState("");
  const [creationEnCours, setCreationEnCours] = useState(false);

  const listeRapides = useMemo(() => listeGabaritsDockerRapide(), []);

  const gabaritPourEtape2 = useMemo(() => {
    const prem = listeRapides[0];
    if (prem === undefined) {
      throw new Error("Catalogue gabarits vide.");
    }
    if (pile?.id === "CUSTOM_RAPIDE") {
      return trouverGabaritDockerRapideParId(gabaritPersoId.trim()) ?? prem;
    }
    if (pile?.id === "NGINX_STATIC") {
      return trouverGabaritDockerRapideParId("rapide-nginx") ?? prem;
    }
    if (pile?.id === "NODE_JS") {
      return trouverGabaritDockerRapideParId("rapide-node") ?? prem;
    }
    if (pile?.id === "PHP_FPM") {
      return trouverGabaritDockerRapideParId("rapide-nginx") ?? prem;
    }
    return prem;
  }, [listeRapides, pile, gabaritPersoId]);

  const defautsFormulaire = useMemo(() => {
    const o: Record<string, string> = {};
    for (const c of gabaritPourEtape2.champsFormulaire) {
      if (c.defaut !== undefined) {
        o[c.cle] = c.defaut;
      }
    }
    return o;
  }, [gabaritPourEtape2]);

  const validerEtape1 = () => {
    if (pile === null) {
      pousserToast("Choisissez une pile ou un gabarit catalogue.", "erreur");
      return;
    }
    setEtape(2);
  };

  const gererSoumissionFormulaire = async (valeurs: Record<string, string>) => {
    if (pile === null) {
      return;
    }
    const nomConteneur = (valeurs.NOM_CONTAINER ?? "").trim();
    if (nomConteneur.length === 0) {
      pousserToast("Nom du container obligatoire.", "erreur");
      return;
    }
    const portHoteBrut = Number(valeurs.PORT_HOTE ?? "0");
    const memoire = pile.id === "PHP_FPM" ? 512 : gabaritPourEtape2.memoireRecommandeMb;
    const env: Record<string, string> = {};
    for (const [cle, val] of Object.entries(valeurs)) {
      if (cle !== "NOM_CONTAINER" && cle !== "PORT_HOTE") {
        env[cle] = val;
      }
    }
    setCreationEnCours(true);
    try {
      const cree = await creerWebInstancePasserelle({
        name: nomConteneur,
        techStack: pile.techApi,
        memoryMb: memoire,
        diskGb: 10,
        env,
        portHote: Number.isFinite(portHoteBrut) ? portHoteBrut : 0,
        domaineInitial: domaineOptionnel.trim() || undefined,
        gabaritDockerRapideId:
          pile.techApi === "CUSTOM" ? gabaritPersoId.trim() : undefined,
      });
      pousserToast("Instance web créée.", "succes");
      navigate(`/hebergement/containers/${encodeURIComponent(cree.id)}`);
    } catch (error_) {
      pousserToast(error_ instanceof Error ? error_.message : "Création impossible.", "erreur");
    } finally {
      setCreationEnCours(false);
    }
  };

  return (
    <>
      <p className="kp-texte-muted">
        <Link to="/hebergement/containers" className="kp-lien-inline">
          Mes containers
        </Link>
      </p>
      <div className="kp-page-entete">
        <h1 className="kp-page-titre">Nouveau container</h1>
      </div>

      {etape === 1 ? (
        <section className="kp-panel-corps">
          <h2 className="kp-section-label">Étape 1 — Type de container</h2>
          <div className="kp-grille-cartes-serveurs">
            {CARTES_PILE.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`kp-dash-carte${pile?.id === c.id ? " kp-dash-carte--actif" : ""}`}
                onClick={() => setPile(c)}
                style={{ textAlign: "left", cursor: "pointer" }}
              >
                <h3 style={{ marginTop: 0 }}>{c.titre}</h3>
                <p className="kp-texte-muted" style={{ marginBottom: 0 }}>
                  {c.detail}
                </p>
              </button>
            ))}
          </div>
          {pile?.id === "CUSTOM_RAPIDE" ? (
            <div className="kp-marges-haut-sm">
              <label className="kp-section-label" htmlFor="gabarit-id">
                Gabarit catalogue
              </label>
              <select
                id="gabarit-id"
                className="kp-champ-texte"
                value={gabaritPersoId}
                onChange={(e) => setGabaritPersoId(e.target.value)}
              >
                {listeRapides.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nom}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="kp-marges-haut-sm">
            <button type="button" className="kp-btn kp-btn--primaire" onClick={validerEtape1}>
              Continuer
            </button>
          </div>
        </section>
      ) : (
        <section className="kp-panel-corps">
          <h2 className="kp-section-label">Étape 2 — Configuration</h2>
          <div className="kp-marges-haut-sm">
            <p className="kp-section-label">Domaine (optionnel)</p>
            <input
              type="text"
              className="kp-champ-texte"
              placeholder="ex. mon-site.fr"
              value={domaineOptionnel}
              onChange={(e) => setDomaineOptionnel(e.target.value)}
              autoComplete="off"
            />
            <p className="kp-texte-muted" style={{ fontSize: "0.82rem" }}>
              Ajout automatique dans le Proxy Manager après création si le proxy est disponible.
            </p>
          </div>
          <FormulaireGabarit
            champs={gabaritPourEtape2.champsFormulaire}
            valeursInitiales={defautsFormulaire}
            libelleAction="Créer le container"
            enCours={creationEnCours}
            messageErreur={null}
            onSubmit={(v) => gererSoumissionFormulaire(v).catch(() => {})}
          />
          <button
            type="button"
            className="kp-btn kp-btn--ghost kp-marges-haut-sm"
            onClick={() => setEtape(1)}
          >
            Retour
          </button>
        </section>
      )}
    </>
  );
}
