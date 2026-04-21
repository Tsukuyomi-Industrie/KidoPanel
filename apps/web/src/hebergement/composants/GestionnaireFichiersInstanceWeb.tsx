import { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from "react";
import {
  ecrireFichierInstanceWebPasserelle,
  listerFichiersInstanceWebPasserelle,
  lireFichierInstanceWebPasserelle,
  supprimerCheminInstanceWebPasserelle,
  type EntreeListeFichiersPasserelle,
} from "../../passerelle/serviceFichiersInstancePasserelle.js";

type Props = {
  readonly idInstanceWeb: string;
  readonly actif: boolean;
};

function joindreChemin(repertoire: string, nom: string): string {
  const base = repertoire.endsWith("/") ? repertoire.slice(0, -1) : repertoire;
  return `${base}/${nom}`;
}

/** Explorateur fichiers pour une instance web (chemins absolus contrôlés par le moteur). */
export function GestionnaireFichiersInstanceWeb({ idInstanceWeb, actif }: Props) {
  const [cheminRepertoire, definirCheminRepertoire] = useState("/var/www");
  const [entrees, definirEntrees] = useState<EntreeListeFichiersPasserelle[]>([]);
  const [chargementListe, definirChargementListe] = useState(false);
  const [erreur, definirErreur] = useState<string | null>(null);
  const [fichierOuvert, definirFichierOuvert] = useState<string | null>(null);
  const [contenuEdition, definirContenuEdition] = useState("");
  const [chargementFichier, definirChargementFichier] = useState(false);
  const [patientEcriture, definirPatientEcriture] = useState(false);

  const rechargerListe = useCallback(async () => {
    if (!actif) return;
    definirChargementListe(true);
    definirErreur(null);
    try {
      const liste = await listerFichiersInstanceWebPasserelle(
        idInstanceWeb,
        cheminRepertoire,
      );
      definirEntrees(liste);
    } catch (error_) {
      definirErreur(error_ instanceof Error ? error_.message : String(error_));
      definirEntrees([]);
    } finally {
      definirChargementListe(false);
    }
  }, [actif, cheminRepertoire, idInstanceWeb]);

  useEffect(() => {
    rechargerListe().catch(() => {});
  }, [rechargerListe]);

  const ouvrirRepertoire = (nom: string): void => {
    definirCheminRepertoire(joindreChemin(cheminRepertoire, nom));
    definirFichierOuvert(null);
    definirContenuEdition("");
  };

  const remonter = (): void => {
    if (cheminRepertoire === "/") return;
    const segments = cheminRepertoire.split("/").filter(Boolean);
    segments.pop();
    definirCheminRepertoire(segments.length === 0 ? "/" : `/${segments.join("/")}`);
    definirFichierOuvert(null);
    definirContenuEdition("");
  };

  const ouvrirFichier = async (nom: string): Promise<void> => {
    const chemin = joindreChemin(cheminRepertoire, nom);
    definirFichierOuvert(chemin);
    definirChargementFichier(true);
    definirErreur(null);
    try {
      const texte = await lireFichierInstanceWebPasserelle(idInstanceWeb, chemin);
      definirContenuEdition(texte);
    } catch (error_) {
      definirErreur(error_ instanceof Error ? error_.message : String(error_));
      definirContenuEdition("");
    } finally {
      definirChargementFichier(false);
    }
  };

  const enregistrerFichier = async (evt: FormEvent): Promise<void> => {
    evt.preventDefault();
    if (fichierOuvert === null || patientEcriture) return;
    definirPatientEcriture(true);
    definirErreur(null);
    try {
      await ecrireFichierInstanceWebPasserelle(idInstanceWeb, fichierOuvert, contenuEdition);
    } catch (error_) {
      definirErreur(error_ instanceof Error ? error_.message : String(error_));
    } finally {
      definirPatientEcriture(false);
    }
  };

  const supprimerSelection = async (): Promise<void> => {
    if (fichierOuvert === null) return;
    if (!globalThis.window.confirm(`Supprimer définitivement :\n${fichierOuvert} ?`)) {
      return;
    }
    definirErreur(null);
    try {
      await supprimerCheminInstanceWebPasserelle(idInstanceWeb, fichierOuvert);
      definirFichierOuvert(null);
      definirContenuEdition("");
      await rechargerListe();
    } catch (error_) {
      definirErreur(error_ instanceof Error ? error_.message : String(error_));
    }
  };

  const importerFichierLocal = (evt: ChangeEvent<HTMLInputElement>): void => {
    const fichier = evt.target.files?.[0];
    if (fichier === undefined) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      definirContenuEdition(typeof lecteur.result === "string" ? lecteur.result : "");
    };
    lecteur.readAsText(fichier, "utf8");
    evt.target.value = "";
  };

  const exporterVersTelechargement = (): void => {
    if (fichierOuvert === null) return;
    const blob = new Blob([contenuEdition], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const lien = globalThis.document.createElement("a");
    lien.href = url;
    lien.download = fichierOuvert.split("/").pop() ?? "fichier.txt";
    lien.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="kp-panel-corps kp-marges-haut-sm">
      <h2 className="kp-section-label">Fichiers du conteneur</h2>
      <p className="kp-texte-muted kp-marges-haut-sm">
        Chemins absolus sans « .. ». Répertoire de départ typique applicatif : <code>/var/www</code>.
      </p>
      {erreur === null ? null : (
        <p className="kp-log-ligne kp-log-error" role="alert">
          {erreur}
        </p>
      )}
      <div className="kp-marges-haut-sm">
        <span className="kp-cellule-mono">{cheminRepertoire}</span>
        <button type="button" className="kp-btn kp-btn--ghost kp-btn--sm kp-marges-haut-sm" onClick={remonter}>
          Répertoire parent
        </button>
        <button
          type="button"
          className="kp-btn kp-btn--ghost kp-btn--sm"
          onClick={() => rechargerListe().catch(() => {})}
          disabled={chargementListe}
        >
          Actualiser
        </button>
      </div>
      <ul className="kp-marges-haut-sm" style={{ listStyle: "none", paddingLeft: 0 }}>
        {chargementListe ? (
          <li>Chargement…</li>
        ) : (
          entrees.map((e) => (
            <li key={e.nom} style={{ marginBottom: "0.35rem" }}>
              {e.repertoire ? (
                <button type="button" className="kp-lien-inline" onClick={() => ouvrirRepertoire(e.nom)}>
                  [dossier] {e.nom}
                </button>
              ) : (
                <button type="button" className="kp-lien-inline" onClick={() => ouvrirFichier(e.nom).catch(() => {})}>
                  [fichier] {e.nom}
                </button>
              )}
            </li>
          ))
        )}
      </ul>

      <h3 className="kp-section-label kp-marges-haut-sm">Édition fichier</h3>
      {fichierOuvert === null ? (
        <p className="kp-texte-muted">Sélectionnez un fichier dans la liste.</p>
      ) : (
        <form onSubmit={(e) => enregistrerFichier(e).catch(() => {})}>
          <p className="kp-cellule-mono kp-marges-haut-sm">{fichierOuvert}</p>
          <textarea
            className="kp-marges-haut-sm"
            style={{ width: "100%", minHeight: "12rem", fontFamily: "var(--kp-font-mono)" }}
            value={contenuEdition}
            onChange={(e) => definirContenuEdition(e.target.value)}
            disabled={chargementFichier || patientEcriture}
            spellCheck={false}
          />
          <div className="kp-marges-haut-sm">
            <button type="submit" className="kp-btn kp-btn--primaire kp-btn--sm" disabled={patientEcriture}>
              Enregistrer dans le conteneur
            </button>
            <button type="button" className="kp-btn kp-btn--ghost kp-btn--sm" onClick={() => exporterVersTelechargement()}>
              Exporter (télécharger)
            </button>
            <button type="button" className="kp-btn kp-btn--ghost kp-btn--sm" onClick={() => supprimerSelection().catch(() => {})}>
              Supprimer ce chemin
            </button>
          </div>
        </form>
      )}
      <p className="kp-marges-haut-sm">
        <label>
          Importer un fichier texte local dans l’éditeur :{" "}
          <input type="file" onChange={(e) => importerFichierLocal(e)} />
        </label>
      </p>
    </section>
  );
}
