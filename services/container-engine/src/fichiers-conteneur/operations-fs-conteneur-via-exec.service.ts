import type { ContainerEngine } from "../container-engine.js";
import {
  FS_CONTENEUR_OCTETS_MAX_FICHIER_TEXTE,
  normaliserCheminAbsoluFsConteneur,
} from "./valider-chemin-fs-conteneur.js";

export type EntreeListeFsConteneur = {
  nom: string;
  repertoire: boolean;
};

function decoderTailleUtf8(chaine: string): number {
  return Buffer.byteLength(chaine, "utf8");
}

/** Liste les entrées directes d’un répertoire via `ls -1Ap`. */
export async function listerRepertoireViaExec(params: {
  engine: ContainerEngine;
  idConteneur: string;
  cheminAbsoluBrut: string;
}): Promise<{ entrees: EntreeListeFsConteneur[] }> {
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
  const entrees: EntreeListeFsConteneur[] = lignes.map((ligne) => {
    const repertoire = ligne.endsWith("/");
    const nom = repertoire ? ligne.slice(0, -1) : ligne;
    return { nom, repertoire };
  });
  return { entrees };
}

/** Lit un fichier texte via `cat` avec limite d’octets. */
export async function lireFichierTexteViaExec(params: {
  engine: ContainerEngine;
  idConteneur: string;
  cheminAbsoluBrut: string;
  octetsMax?: number;
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
  const max = params.octetsMax ?? FS_CONTENEUR_OCTETS_MAX_FICHIER_TEXTE;
  if (decoderTailleUtf8(resultat.stdout) > max) {
    throw new Error("Fichier trop volumineux pour cette opération.");
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
  if (decoderTailleUtf8(params.contenuUtf8) > FS_CONTENEUR_OCTETS_MAX_FICHIER_TEXTE) {
    throw new Error("Contenu trop volumineux pour cette opération.");
  }
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
