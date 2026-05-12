import { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from "react";
import {
  compresserCheminInstanceServeurJeuxPasserelle,
  decompresserArchiveInstanceServeurJeuxPasserelle,
  ecrireFichierInstanceServeurJeuxPasserelle,
  listerFichiersInstanceServeurJeuxPasserelle,
  lireFichierInstanceServeurJeuxPasserelle,
  supprimerCheminInstanceServeurJeuxPasserelle,
  type EntreeListeFichiersPasserelle,
} from "../../passerelle/serviceFichiersInstancePasserelle.js";
import {
  LIMITE_OCTETS_EDITION_FICHIER_TEXTE,
  creerMessageFichierTropVolumineux,
} from "../../fichiers/limites-edition-texte.js";

type Props = {
  readonly idInstance: string;
  readonly actif: boolean;
};

type CategorieTypeFichier =
  | "dossier"
  | "code"
  | "image"
  | "archive"
  | "audio"
  | "video"
  | "document"
  | "donnees"
  | "configuration"
  | "script"
  | "autre";

function joindreChemin(repertoire: string, nom: string): string {
  const base = repertoire.endsWith("/") ? repertoire.slice(0, -1) : repertoire;
  return `${base}/${nom}`;
}

function extraireExtensionDepuisNom(nom: string): string | null {
  const indexDernierPoint = nom.lastIndexOf(".");
  if (indexDernierPoint <= 0 || indexDernierPoint === nom.length - 1) {
    return null;
  }
  return nom.slice(indexDernierPoint + 1).toLowerCase();
}

function determinerCategorieTypeFichier(entree: EntreeListeFichiersPasserelle): CategorieTypeFichier {
  if (entree.repertoire) return "dossier";
  const extension = extraireExtensionDepuisNom(entree.nom);
  if (extension === null) return "autre";

  if (["ts", "tsx", "js", "jsx", "java", "go", "rs", "py", "php", "cs"].includes(extension)) {
    return "code";
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "ico"].includes(extension)) {
    return "image";
  }
  if (["zip", "tar", "gz", "tgz", "bz2", "7z", "rar"].includes(extension)) {
    return "archive";
  }
  if (["mp3", "wav", "ogg", "flac", "m4a"].includes(extension)) {
    return "audio";
  }
  if (["mp4", "mkv", "avi", "webm", "mov"].includes(extension)) {
    return "video";
  }
  if (["md", "pdf", "doc", "docx", "txt", "rtf"].includes(extension)) {
    return "document";
  }
  if (["json", "yml", "yaml", "toml", "ini", "env"].includes(extension)) {
    return "configuration";
  }
  if (["sql", "db", "sqlite", "csv", "parquet"].includes(extension)) {
    return "donnees";
  }
  if (["sh", "bash", "zsh", "ps1"].includes(extension)) {
    return "script";
  }
  return "autre";
}

function formatterTaille(octets: number | null): string {
  if (octets === null) return "Dossier";
  if (octets < 1024) return `${String(octets)} o`;
  const ko = octets / 1024;
  if (ko < 1024) return `${ko.toFixed(1)} Ko`;
  const mo = ko / 1024;
  if (mo < 1024) return `${mo.toFixed(1)} Mo`;
  return `${(mo / 1024).toFixed(2)} Go`;
}

function formatterDate(iso: string | null): string {
  if (iso === null) return "Indisponible";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Indisponible";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function IcotypeFichier({ categorie }: { readonly categorie: CategorieTypeFichier }) {
  return <span className={`kp-fichiers-serveur__icone kp-fichiers-serveur__icone--${categorie}`} aria-hidden="true" />;
}

/** Explorateur fichiers conteneur (chemins absolus stricts côté moteur). */
export function GestionnaireFichiersInstanceServeur({ idInstance, actif }: Props) {
  const [cheminRepertoire, definirCheminRepertoire] = useState("/data");
  const [entrees, definirEntrees] = useState<EntreeListeFichiersPasserelle[]>([]);
  const [chargementListe, definirChargementListe] = useState(false);
  const [erreur, definirErreur] = useState<string | null>(null);
  const [fichierOuvert, definirFichierOuvert] = useState<string | null>(null);
  const [contenuEdition, definirContenuEdition] = useState("");
  const [chargementFichier, definirChargementFichier] = useState(false);
  const [patientEcriture, definirPatientEcriture] = useState(false);
  const [patientArchive, definirPatientArchive] = useState(false);

  const rechargerListe = useCallback(async () => {
    if (!actif) return;
    definirChargementListe(true);
    definirErreur(null);
    try {
      const liste = await listerFichiersInstanceServeurJeuxPasserelle(
        idInstance,
        cheminRepertoire,
      );
      definirEntrees(liste);
    } catch (error_) {
      definirErreur(error_ instanceof Error ? error_.message : String(error_));
      definirEntrees([]);
    } finally {
      definirChargementListe(false);
    }
  }, [actif, cheminRepertoire, idInstance]);

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

  const ouvrirFichier = async (entree: EntreeListeFichiersPasserelle): Promise<void> => {
    const chemin = joindreChemin(cheminRepertoire, entree.nom);
    if (
      typeof entree.tailleOctets === "number" &&
      entree.tailleOctets > LIMITE_OCTETS_EDITION_FICHIER_TEXTE
    ) {
      definirFichierOuvert(null);
      definirContenuEdition("");
      definirErreur(creerMessageFichierTropVolumineux(entree.tailleOctets));
      return;
    }
    definirFichierOuvert(chemin);
    definirChargementFichier(true);
    definirErreur(null);
    try {
      const texte = await lireFichierInstanceServeurJeuxPasserelle(idInstance, chemin);
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
      await ecrireFichierInstanceServeurJeuxPasserelle(
        idInstance,
        fichierOuvert,
        contenuEdition,
      );
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
      await supprimerCheminInstanceServeurJeuxPasserelle(idInstance, fichierOuvert);
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
    if (fichier.size > LIMITE_OCTETS_EDITION_FICHIER_TEXTE) {
      definirErreur(creerMessageFichierTropVolumineux(fichier.size));
      evt.target.value = "";
      return;
    }
    const lecteur = new FileReader();
    lecteur.onload = () => {
      definirContenuEdition(
        typeof lecteur.result === "string" ? lecteur.result : "",
      );
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

  const lancerCompressionZip = async (): Promise<void> => {
    const sourceNom = globalThis.window.prompt(
      "Nom du fichier ou dossier à compresser (dans le répertoire courant) :",
    );
    if (sourceNom === null) return;
    const sourceNomNettoye = sourceNom.trim();
    if (sourceNomNettoye.length === 0) return;

    const archiveNom = globalThis.window.prompt(
      "Nom de l'archive zip de sortie (ex: sauvegarde.zip) :",
      `${sourceNomNettoye}.zip`,
    );
    if (archiveNom === null) return;
    const archiveNomNettoye = archiveNom.trim();
    if (archiveNomNettoye.length === 0) return;

    definirErreur(null);
    definirPatientArchive(true);
    try {
      await compresserCheminInstanceServeurJeuxPasserelle(
        idInstance,
        joindreChemin(cheminRepertoire, sourceNomNettoye),
        joindreChemin(cheminRepertoire, archiveNomNettoye),
      );
      await rechargerListe();
    } catch (error_) {
      definirErreur(error_ instanceof Error ? error_.message : String(error_));
    } finally {
      definirPatientArchive(false);
    }
  };

  const lancerDecompressionZip = async (): Promise<void> => {
    const archiveNom = globalThis.window.prompt(
      "Nom de l'archive zip à décompresser (dans le répertoire courant) :",
    );
    if (archiveNom === null) return;
    const archiveNomNettoye = archiveNom.trim();
    if (archiveNomNettoye.length === 0) return;

    const destinationNom = globalThis.window.prompt(
      "Nom du dossier de destination (dans le répertoire courant) :",
      "extraction",
    );
    if (destinationNom === null) return;
    const destinationNomNettoye = destinationNom.trim();
    if (destinationNomNettoye.length === 0) return;

    definirErreur(null);
    definirPatientArchive(true);
    try {
      await decompresserArchiveInstanceServeurJeuxPasserelle(
        idInstance,
        joindreChemin(cheminRepertoire, archiveNomNettoye),
        joindreChemin(cheminRepertoire, destinationNomNettoye),
      );
      await rechargerListe();
    } catch (error_) {
      definirErreur(error_ instanceof Error ? error_.message : String(error_));
    } finally {
      definirPatientArchive(false);
    }
  };

  return (
    <section className="kp-panel-corps kp-marges-haut-sm kp-fichiers-serveur">
      <div className="kp-fichiers-serveur__entete">
        <div>
          <h2 className="kp-section-label">Fichiers du conteneur</h2>
          <p className="kp-texte-muted kp-fichiers-serveur__description">
            Chemins absolus autorisés : lettres, chiffres, tirets, points et barres obliques (pas de « .. »).
            Répertoire initial conseillé pour les mondes Minecraft : <code>/data</code>.
          </p>
        </div>
        <div className="kp-fichiers-serveur__actions-entete">
          <button type="button" className="kp-btn kp-btn--ghost kp-btn--sm" onClick={remonter}>
            Répertoire parent
          </button>
          <button
            type="button"
            className="kp-btn kp-btn--ghost kp-btn--sm"
            onClick={() => rechargerListe().catch(() => {})}
            disabled={chargementListe}
          >
            {chargementListe ? "Actualisation..." : "Actualiser"}
          </button>
          <button
            type="button"
            className="kp-btn kp-btn--secondaire kp-btn--sm"
            onClick={() => lancerCompressionZip().catch(() => {})}
            disabled={patientArchive}
          >
            Zipper
          </button>
          <button
            type="button"
            className="kp-btn kp-btn--secondaire kp-btn--sm"
            onClick={() => lancerDecompressionZip().catch(() => {})}
            disabled={patientArchive}
          >
            Dézipper
          </button>
        </div>
      </div>
      {erreur === null ? null : (
        <p className="kp-log-ligne kp-log-error" role="alert">
          {erreur}
        </p>
      )}

      <div className="kp-fichiers-serveur__chemin">
        <span className="kp-texte-muted">Chemin courant</span>
        <span className="kp-cellule-mono">{cheminRepertoire}</span>
      </div>

      <div className="kp-fichiers-serveur__contenu">
        <section className="kp-fichiers-serveur__liste">
          <h3 className="kp-section-label">Arborescence</h3>
          <ul className="kp-fichiers-serveur__liste-elements">
            {chargementListe ? (
              <li className="kp-texte-muted">Chargement de l'arborescence...</li>
            ) : entrees.length === 0 ? (
              <li className="kp-texte-muted">Aucun fichier trouvé dans ce répertoire.</li>
            ) : (
              entrees.map((e) => (
                <li key={e.nom}>
                  {e.repertoire ? (
                    <button
                      type="button"
                      className="kp-fichiers-serveur__entree kp-fichiers-serveur__entree--dossier"
                      onClick={() => ouvrirRepertoire(e.nom)}
                    >
                      <IcotypeFichier categorie={determinerCategorieTypeFichier(e)} />
                      <span className="kp-fichiers-serveur__nom">{e.nom}</span>
                      <span className="kp-fichiers-serveur__badge-type">Dossier</span>
                      <span className="kp-fichiers-serveur__meta">
                        Taille: {formatterTaille(e.tailleOctets)} · Création: {formatterDate(e.dateCreationIso)} ·
                        Modifié: {formatterDate(e.dateModificationIso)}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="kp-fichiers-serveur__entree"
                      onClick={() => ouvrirFichier(e).catch(() => {})}
                    >
                      <IcotypeFichier categorie={determinerCategorieTypeFichier(e)} />
                      <span className="kp-fichiers-serveur__nom">{e.nom}</span>
                      <span className="kp-fichiers-serveur__badge-type kp-fichiers-serveur__badge-type--fichier">
                        {extraireExtensionDepuisNom(e.nom) ?? "Aucune ext"}
                      </span>
                      <span className="kp-fichiers-serveur__meta">
                        Taille: {formatterTaille(e.tailleOctets)} · Création: {formatterDate(e.dateCreationIso)} ·
                        Modifié: {formatterDate(e.dateModificationIso)}
                      </span>
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="kp-fichiers-serveur__edition">
          <h3 className="kp-section-label">Édition fichier</h3>
          {fichierOuvert === null ? (
            <p className="kp-texte-muted">Sélectionnez un fichier dans la liste pour démarrer l'édition.</p>
          ) : (
            <form className="kp-fichiers-serveur__formulaire" onSubmit={(e) => enregistrerFichier(e).catch(() => {})}>
              <p className="kp-cellule-mono kp-fichiers-serveur__fichier-ouvert">{fichierOuvert}</p>
              <textarea
                className="kp-textarea kp-fichiers-serveur__zone-edition"
                value={contenuEdition}
                onChange={(e) => definirContenuEdition(e.target.value)}
                disabled={chargementFichier || patientEcriture}
                spellCheck={false}
              />
              <div className="kp-fichiers-serveur__actions-edition">
                <button type="submit" className="kp-btn kp-btn--primaire kp-btn--sm" disabled={patientEcriture}>
                  {patientEcriture ? "Enregistrement..." : "Enregistrer dans le conteneur"}
                </button>
                <button
                  type="button"
                  className="kp-btn kp-btn--secondaire kp-btn--sm"
                  onClick={() => exporterVersTelechargement()}
                >
                  Exporter
                </button>
                <button
                  type="button"
                  className="kp-btn kp-btn--danger kp-btn--sm"
                  onClick={() => supprimerSelection().catch(() => {})}
                >
                  Supprimer ce chemin
                </button>
              </div>
            </form>
          )}
          <div className="kp-fichiers-serveur__import">
            <label htmlFor="kp-import-fichier-serveur" className="kp-texte-muted">
              Importer un fichier texte local dans l'éditeur
            </label>
            <input id="kp-import-fichier-serveur" type="file" onChange={(e) => importerFichierLocal(e)} />
          </div>
        </section>
      </div>
    </section>
  );
}
