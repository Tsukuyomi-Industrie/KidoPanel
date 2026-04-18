/** Construit les libellés du fil d’Ariane à partir du chemin de route React Router. */
export function segmentsFilArianeDepuisChemin(chemin: string): string[] {
  const p = chemin.replace(/\/$/, "") || "/";

  if (p === "/") {
    return ["Tableau de bord"];
  }
  if (p === "/parametres") {
    return ["Paramètres"];
  }
  if (p === "/hebergement") {
    return ["Hébergement web"];
  }
  if (p === "/serveurs") {
    return ["Serveurs de jeu"];
  }
  if (p === "/serveurs/nouveau") {
    return ["Serveurs de jeu", "Création"];
  }
  const detailServeur = /^\/serveurs\/([^/]+)$/.exec(p);
  if (detailServeur !== null && detailServeur[1] !== "nouveau") {
    return ["Serveurs de jeu", "Instance"];
  }
  if (p === "/coeur-docker") {
    return ["Cœur Docker"];
  }
  if (p === "/coeur-docker/nouveau") {
    return ["Cœur Docker", "Création d’instance"];
  }
  if (p === "/admin/utilisateurs") {
    return ["Administration", "Utilisateurs"];
  }
  if (p === "/admin/journal-audit") {
    return ["Administration", "Journal d’audit"];
  }
  const detailUtil = /^\/admin\/utilisateurs\/([^/]+)$/.exec(p);
  if (detailUtil !== null) {
    return ["Administration", "Utilisateurs", "Fiche compte"];
  }
  const quotas = /^\/admin\/utilisateurs\/([^/]+)\/quotas$/.exec(p);
  if (quotas !== null) {
    return ["Administration", "Utilisateurs", "Quotas"];
  }
  return ["KidoPanel"];
}
