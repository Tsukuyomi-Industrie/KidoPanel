import { randomUUID } from "node:crypto";
import type { DomaineProxy as LigneDomaineProxy } from "@kidopanel/database";
import type { DepotDomaineProxy } from "../repositories/depot-domaine-proxy.repository.js";
import type { ClientMoteurWebHttp } from "./client-moteur-web.service.js";
import {
  obtenirCheminConfGenereeDansProxy,
  obtenirNomConteneurProxyNginx,
} from "../config/environnement-web-service.js";
import { ErreurMetierWebInstance } from "../erreurs/erreurs-metier-web-instance.js";

type ResumeConteneurListe = {
  id: string;
  names: string[];
  state: string;
};

/**
 * Régénère la configuration Nginx du conteneur proxy partagé et recharge le service sans couper Docker localement depuis ce service (appels HTTP moteur).
 */
export class ProxyManagerService {
  constructor(
    private readonly depotDomaine: DepotDomaineProxy,
    private readonly clientMoteur: ClientMoteurWebHttp,
  ) {}

  genererBlocServeurNginx(domaine: LigneDomaineProxy): string {
    const nomHote = domaine.domaine.trim().toLowerCase();
    const cible = `${domaine.cibleInterne.trim()}:${String(domaine.portCible)}`;
    const lignesCommunes = [
      `    proxy_pass http://${cible};`,
      `    proxy_set_header Host $host;`,
      `    proxy_set_header X-Real-IP $remote_addr;`,
      `    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`,
      `    proxy_set_header X-Forwarded-Proto $scheme;`,
      `    proxy_http_version 1.1;`,
      `    proxy_set_header Upgrade $http_upgrade;`,
      `    proxy_set_header Connection "upgrade";`,
    ];
    if (
      domaine.sslActif &&
      domaine.cheminCertificat !== null &&
      domaine.cheminCertificat.trim().length > 0
    ) {
      const chemin = domaine.cheminCertificat.trim();
      return [
        `server {`,
        `    listen 80;`,
        `    server_name ${nomHote};`,
        `    return 301 https://$host$request_uri;`,
        `}`,
        `server {`,
        `    listen 443 ssl;`,
        `    server_name ${nomHote};`,
        `    ssl_certificate ${chemin}/fullchain.pem;`,
        `    ssl_certificate_key ${chemin}/privkey.pem;`,
        `    location / {`,
        ...lignesCommunes,
        `    }`,
        `}`,
      ].join("\n");
    }
    return [
      `server {`,
      `    listen 80;`,
      `    server_name ${nomHote};`,
      `    location / {`,
      ...lignesCommunes,
      `    }`,
      `}`,
    ].join("\n");
  }

  async verifierProxyDisponible(identifiantRequeteHttp: string): Promise<string> {
    const nomAttendu = obtenirNomConteneurProxyNginx();
    const reponse = await this.clientMoteur.obtenirListeConteneurs(identifiantRequeteHttp);
    const texte = await reponse.text();
    if (!reponse.ok) {
      throw new ErreurMetierWebInstance(
        "MOTEUR_CONTENEURS_ERREUR",
        "Impossible de lister les conteneurs pour localiser le proxy.",
        reponse.status >= 400 ? reponse.status : 502,
      );
    }
    let parse: { containers?: ResumeConteneurListe[] };
    try {
      parse = JSON.parse(texte) as { containers?: ResumeConteneurListe[] };
    } catch {
      throw new ErreurMetierWebInstance(
        "PROXY_NGINX_INDISPONIBLE",
        "Réponse moteur illisible lors de la recherche du proxy.",
        502,
      );
    }
    const liste = parse.containers ?? [];
    const avecNom = liste.filter((c) =>
      c.names.some((n) => n.replace(/^\//, "") === nomAttendu || n.endsWith(`/${nomAttendu}`)),
    );
    const actif = avecNom.find((c) => c.state === "running");
    const cible = actif ?? avecNom[0];
    if (cible === undefined) {
      throw new ErreurMetierWebInstance(
        "PROXY_NGINX_INDISPONIBLE",
        `Le conteneur proxy « ${nomAttendu} » est introuvable ou arrêté.`,
        503,
      );
    }
    return cible.id;
  }

  async rechargerConfigurationProxy(
    domaines?: LigneDomaineProxy[],
    identifiantRequeteHttp?: string,
  ): Promise<void> {
    const liste: LigneDomaineProxy[] =
      domaines ?? (await this.depotDomaine.listerTousOrdreDomaine());
    const corpsConf = [
      `# Fichier généré par KidoPanel — ne pas modifier à la main.`,
      ...liste.map((d) => this.genererBlocServeurNginx(d)),
    ].join("\n\n");
    const rid = identifiantRequeteHttp ?? randomUUID();
    const idProxy = await this.verifierProxyDisponible(rid);
    const chemin = obtenirCheminConfGenereeDansProxy();
    const commande = `cat > '${chemin.replace(/'/g, "'\\''")}' && nginx -t && nginx -s reload`;
    const reponseExec = await this.clientMoteur.posterExecDansConteneur(
      idProxy,
      {
        cmd: ["/bin/sh", "-c", commande],
        stdinUtf8: corpsConf,
      },
      rid,
    );
    const corps = await reponseExec.text();
    if (!reponseExec.ok) {
      throw new ErreurMetierWebInstance(
        "PROXY_REGENERATION_ECHEC",
        "Échec lors de l’écriture ou du rechargement Nginx dans le proxy.",
        reponseExec.status >= 400 ? reponseExec.status : 502,
        { detail: corps.slice(0, 1500) },
      );
    }
    let parse: { exitCode?: unknown; stderr?: unknown };
    try {
      parse = JSON.parse(corps) as { exitCode?: unknown; stderr?: unknown };
    } catch {
      throw new ErreurMetierWebInstance(
        "PROXY_REGENERATION_ECHEC",
        "Réponse inattendue après exécution dans le conteneur proxy.",
        502,
      );
    }
    const code = typeof parse.exitCode === "number" ? parse.exitCode : -1;
    if (code !== 0) {
      const errStd = typeof parse.stderr === "string" ? parse.stderr : "";
      throw new ErreurMetierWebInstance(
        "PROXY_REGENERATION_ECHEC",
        `Nginx a refusé la configuration (code ${String(code)}).`,
        500,
        { stderr: errStd.slice(0, 2000) },
      );
    }
  }
}
