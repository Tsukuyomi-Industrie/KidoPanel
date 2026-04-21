import {
  ClientMoteurHttpPartage,
  type CorpsCreationConteneurMoteurPartage,
} from "@kidopanel/database";

export type CorpsCreationConteneurMoteur = CorpsCreationConteneurMoteurPartage;

/**
 * Client HTTP vers le container-engine pour le service web (aucune dépendance Docker locale).
 */
export class ClientMoteurWebHttp extends ClientMoteurHttpPartage {

  /**
   * Retourne l’IPv4 sur `kidopanel-network` pour un identifiant Docker connu du moteur.
   */
  async obtenirIpv4ReseauKidopanelPourConteneur(
    idConteneurDocker: string,
    identifiantRequete: string,
  ): Promise<string | undefined> {
    const reponse = await this.obtenirListeConteneurs(identifiantRequete);
    const texte = await reponse.text();
    if (!reponse.ok) {
      return undefined;
    }
    try {
      const parse = JSON.parse(texte) as {
        containers?: Array<{ id?: string; ipv4ReseauKidopanel?: string }>;
      };
      const liste = parse.containers ?? [];
      const ligne = liste.find(
        (c) =>
          typeof c.id === "string" &&
          (c.id === idConteneurDocker || c.id.startsWith(idConteneurDocker)),
      );
      const ip = ligne?.ipv4ReseauKidopanel;
      return typeof ip === "string" && ip.length > 0 ? ip : undefined;
    } catch {
      return undefined;
    }
  }

}
