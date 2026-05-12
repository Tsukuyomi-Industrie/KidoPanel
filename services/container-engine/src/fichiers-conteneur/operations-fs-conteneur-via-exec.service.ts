import type { ContainerEngine } from "../container-engine.js";
import {
  normaliserCheminAbsoluFsConteneur,
} from "./valider-chemin-fs-conteneur.js";

export type EntreeListeFsConteneur = {
  nom: string;
  repertoire: boolean;
  tailleOctets: number | null;
  dateCreationIso: string | null;
  dateModificationIso: string | null;
};

/** Liste les entrées directes d’un répertoire via `ls -1Ap`. */
export async function listerRepertoireViaExec(params: {
  engine: ContainerEngine;
  idConteneur: string;
  cheminAbsoluBrut: string;
}): Promise<{ entrees: EntreeListeFsConteneur[] }> {
  function joindreChemin(base: string, nom: string): string {
    if (base === "/") return `/${nom}`;
    return `${base}/${nom}`;
  }

  function convertirEpochVersIso(epochSecondes: number): string | null {
    if (!Number.isFinite(epochSecondes) || epochSecondes <= 0) {
      return null;
    }
    return new Date(epochSecondes * 1000).toISOString();
  }

  const chemin = normaliserCheminAbsoluFsConteneur(params.cheminAbsoluBrut);
  const resultat = await params.engine.executerCommandeDansConteneur(
    params.idConteneur,
    ["/bin/ls", "-1Ap", chemin],
  );
  if (resultat.exitCode !== 0) {
    throw new Error(
      resultat.stderr.trim().length > 0
        ? resultat.stderr.trim()
        : "Liste du répertoire impossible.",
    );
  }
  const lignes = resultat.stdout.split(/\r?\n/).filter((l) => l.length > 0);
  const entreesBase = lignes.map((ligne) => {
    const repertoire = ligne.endsWith("/");
    const nom = repertoire ? ligne.slice(0, -1) : ligne;
    return { nom, repertoire };
  });

  if (entreesBase.length === 0) {
    return { entrees: [] };
  }

  const cheminsAbsolus = entreesBase.map((entree) => joindreChemin(chemin, entree.nom));
  const metaParNom = new Map<
    string,
    { tailleOctets: number | null; dateCreationIso: string | null; dateModificationIso: string | null }
  >();

  const resultatStat = await params.engine.executerCommandeDansConteneur(
    params.idConteneur,
    ["/usr/bin/stat", "-c", "%n\t%s\t%W\t%Y", ...cheminsAbsolus],
  );
  if (resultatStat.exitCode === 0) {
    const lignesStat = resultatStat.stdout.split(/\r?\n/).filter((l) => l.length > 0);
    for (const ligne of lignesStat) {
      const [cheminAbsoluEntree, tailleBrute, creationBrute, modificationBrute] =
        ligne.split("\t");
      const nom = cheminAbsoluEntree?.split("/").pop() ?? "";
      if (nom.length === 0) continue;
      const taille = Number.parseInt(tailleBrute ?? "", 10);
      const creation = Number.parseInt(creationBrute ?? "", 10);
      const modification = Number.parseInt(modificationBrute ?? "", 10);
      metaParNom.set(nom, {
        tailleOctets: Number.isFinite(taille) ? taille : null,
        dateCreationIso: convertirEpochVersIso(creation),
        dateModificationIso: convertirEpochVersIso(modification),
      });
    }
  }

  const entrees: EntreeListeFsConteneur[] = entreesBase.map((entree) => {
    const meta = metaParNom.get(entree.nom);
    return {
      nom: entree.nom,
      repertoire: entree.repertoire,
      tailleOctets: entree.repertoire ? null : (meta?.tailleOctets ?? null),
      dateCreationIso: meta?.dateCreationIso ?? null,
      dateModificationIso: meta?.dateModificationIso ?? null,
    };
  });

  return { entrees };
}

/** Lit un fichier texte via `cat` avec limite d’octets. */
export async function lireFichierTexteViaExec(params: {
  engine: ContainerEngine;
  idConteneur: string;
  cheminAbsoluBrut: string;
}): Promise<{ contenuUtf8: string }> {
  const chemin = normaliserCheminAbsoluFsConteneur(params.cheminAbsoluBrut);
  const resultat = await params.engine.executerCommandeDansConteneur(
    params.idConteneur,
    ["/bin/cat", chemin],
  );
  if (resultat.exitCode !== 0) {
    throw new Error(
      resultat.stderr.trim().length > 0
        ? resultat.stderr.trim()
        : "Lecture du fichier impossible.",
    );
  }
  return { contenuUtf8: resultat.stdout };
}

/** Écrit un fichier texte via `dd` et entrée standard (sans shell). */
export async function ecrireFichierTexteViaExec(params: {
  engine: ContainerEngine;
  idConteneur: string;
  cheminAbsoluBrut: string;
  contenuUtf8: string;
}): Promise<void> {
  const chemin = normaliserCheminAbsoluFsConteneur(params.cheminAbsoluBrut);
  const resultat = await params.engine.executerCommandeDansConteneur(
    params.idConteneur,
    ["/bin/dd", `of=${chemin}`, "conv=notrunc", "status=none"],
    params.contenuUtf8,
  );
  if (resultat.exitCode !== 0) {
    throw new Error(
      resultat.stderr.trim().length > 0
        ? resultat.stderr.trim()
        : "Écriture du fichier impossible.",
    );
  }
}

function extraireDossierParentEtNom(cheminAbsolu: string): { dossierParent: string; nom: string } {
  const segments = cheminAbsolu.split("/").filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    throw new Error("Chemin racine non autorisé pour cette opération.");
  }
  const nom = segments[segments.length - 1]!;
  const dossierParent = segments.length === 1 ? "/" : `/${segments.slice(0, -1).join("/")}`;
  return { dossierParent, nom };
}

/** Compresse un fichier ou dossier validé dans une archive zip. */
export async function compresserCheminViaExec(params: {
  engine: ContainerEngine;
  idConteneur: string;
  cheminSourceAbsoluBrut: string;
  cheminArchiveAbsoluBrut: string;
}): Promise<void> {
  const cheminSource = normaliserCheminAbsoluFsConteneur(params.cheminSourceAbsoluBrut);
  const cheminArchive = normaliserCheminAbsoluFsConteneur(params.cheminArchiveAbsoluBrut);
  const { dossierParent, nom } = extraireDossierParentEtNom(cheminSource);
  const { dossierParent: dossierArchive } = extraireDossierParentEtNom(cheminArchive);
  const script = [
    `cd '${dossierParent}'`,
    `[ -e '${nom}' ]`,
    `mkdir -p '${dossierArchive}'`,
    `zip -r -q '${cheminArchive}' '${nom}'`,
  ].join(" && ");
  const resultat = await params.engine.executerCommandeDansConteneur(
    params.idConteneur,
    ["/bin/sh", "-lc", script],
  );
  if (resultat.exitCode !== 0) {
    throw new Error(
      resultat.stderr.trim().length > 0
        ? resultat.stderr.trim()
        : "Compression zip impossible.",
    );
  }
}

/** Décompresse une archive zip validée vers un dossier de destination. */
export async function decompresserArchiveZipViaExec(params: {
  engine: ContainerEngine;
  idConteneur: string;
  cheminArchiveAbsoluBrut: string;
  cheminDestinationAbsoluBrut: string;
}): Promise<void> {
  const cheminArchive = normaliserCheminAbsoluFsConteneur(params.cheminArchiveAbsoluBrut);
  const cheminDestination = normaliserCheminAbsoluFsConteneur(params.cheminDestinationAbsoluBrut);
  const script = [
    `[ -f '${cheminArchive}' ]`,
    `mkdir -p '${cheminDestination}'`,
    `unzip -o '${cheminArchive}' -d '${cheminDestination}'`,
  ].join(" && ");
  const resultat = await params.engine.executerCommandeDansConteneur(
    params.idConteneur,
    ["/bin/sh", "-lc", script],
  );
  if (resultat.exitCode !== 0) {
    throw new Error(
      resultat.stderr.trim().length > 0
        ? resultat.stderr.trim()
        : "Décompression zip impossible.",
    );
  }
}

/** Supprime un fichier ou un répertoire (récursif) pour chemin validé uniquement. */
export async function supprimerCheminViaExec(params: {
  engine: ContainerEngine;
  idConteneur: string;
  cheminAbsoluBrut: string;
}): Promise<void> {
  const chemin = normaliserCheminAbsoluFsConteneur(params.cheminAbsoluBrut);
  if (chemin === "/") {
    throw new Error("Suppression de la racine interdite.");
  }
  const resultat = await params.engine.executerCommandeDansConteneur(
    params.idConteneur,
    ["/bin/rm", "-rf", chemin],
  );
  if (resultat.exitCode !== 0) {
    throw new Error(
      resultat.stderr.trim().length > 0
        ? resultat.stderr.trim()
        : "Suppression impossible.",
    );
  }
}
