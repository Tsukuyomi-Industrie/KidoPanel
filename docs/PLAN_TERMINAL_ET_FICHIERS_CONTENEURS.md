# Plan strict — Console interactive et gestionnaire de fichiers conteneur

Document de référence pour implémenter, **sans dévier de l’architecture KidoPanel**, une saisie de commandes reliée aux conteneurs et un explorateur de fichiers (import / export / suppression).  
Les étapes sont **ordonnées** : ne pas commencer une phase tant que les prérequis de la phase précédente ne sont pas validés (tests manuels ou automatisés documentés).

---

## 0. Règles non négociables (rappel projet)

| Règle | Application à ce chantier |
|-------|---------------------------|
| Seul **`services/container-engine`** parle à Docker | Toute exécution, copie de fichiers, archives, doit passer par des routes HTTP du moteur (ou extensions futures du même service). |
| **`apps/web`** → **`apps/gateway`** → **services métier** → **container-engine** | Le navigateur ne connaît pas `CONTAINER_ENGINE_BASE_URL`. |
| Types et contrats partagés dans **`packages/`** | Corps JSON exec, modes console, erreurs métier communes : pas de duplication locale front/back. |
| Pas de fichier monolithique **> 300 lignes** | Découper controllers / services / helpers comme le reste du dépôt. |

Références utiles dans le code actuel :

- Flux journaux SSE (instance jeu) : `services/server-service/src/controllers/serverLifecycle.controller.ts` (`GET /:idInstance/logs/stream`).
- Console UI désactivée : `apps/web/src/interface/ConsoleFluxInstance.tsx`.
- Exec ponctuel moteur : `services/container-engine/src/http/routes/containers.routes.ts` (`POST /containers/:id/exec`), schéma `execConteneurJsonSchema` dans `services/container-engine/src/http/schemas/container-api.schemas.ts`.
- Implémentation Docker exec : `services/container-engine/src/docker/exec-commande-conteneur-docker.service.ts`.
- Client HTTP partagé moteur : `packages/database/src/client-moteur-http-partage.ts` (sans `exec` aujourd’hui).
- Exec uniquement côté web-service métier interne : `services/web-service/src/services/client-moteur-web.service.ts` (`posterExecDansConteneur`).

---

## 1. Jalons de livraison (ordre obligatoire)

```
Phase A ──► Phase B ──► Phase C ──► Phase D
                │
                └──► Phase E (peut démarrer après B en parallèle technique,
                     mais même contraintes d’accès instance/conteneur)
```

- **Phase A** : API métier « exec ligne » (HTTP JSON request/response) pour instances **jeu** et **web**, réutilisable par le panel.
- **Phase B** : Interface — activer la saisie dans la console existante et relier à Phase A (toujours **sans** TTY interactif).
- **Phase C** : Terminal « presque temps réel » — session **PTY** + transport adapté (voir §4).
- **Phase D** : Spécialisation par gabarit (Minecraft RCON vs shell vs client SQL).
- **Phase E** : Gestionnaire de fichiers (liste, lecture, écriture, suppression, import/export).

Les phases **A** puis **B** donnent déjà une valeur immédiate (commandes Docker « une ligne », scripts courts, stdin limité comme aujourd’hui côté moteur).

---

## Phase A — HTTP `exec` cloisonné par instance (strict)

### A.1 Objectif

Exposer une route métier équivalente au schéma moteur `{ cmd: string[], stdinUtf8?: string }`, mais **adressée par id d’instance** (pas par id Docker brut), avec les mêmes contrôles d’accès que `logs/stream`.

### A.2 Prérequis internes

1. **Mutualiser** `posterExecDansConteneur` : aujourd’hui dans `ClientMoteurWebHttp` seul ; déplacer la méthode vers **`ClientMoteurHttpPartage`** (`packages/database/src/client-moteur-http-partage.ts`) pour que **server-service** et **web-service** l’utilisent sans dupliquer l’URL ni les en-têtes.
2. **Server-service** : dans `monterRoutesCycleInstanceServeurJeux` (`serverLifecycle.controller.ts`), ajouter **`POST /:idInstance/exec`** qui :
   - appelle `cycleVie.obtenirDetailPourIdentiteInterne` (même motif que `logs/stream`) ;
   - refuse si `containerId` absent ;
   - valide le corps JSON (Zod : **même forme que** `execConteneurJsonSchema` côté moteur, idéalement schéma partagé dans `packages/`) ;
   - relaie vers `clientMoteur.posterExecDansConteneur(idDocker, corps, requestId)` ;
   - renvoie le JSON moteur (`exitCode`, `stdout`, `stderr`) ou erreurs métier harmonisées.
3. **Web-service** : symétriquement, **`POST /:id/exec`** dans `webInstanceLifecycle.controller.ts` (même enchaînement que le `GET …/logs/stream` déjà présent lignes 21–50 environ).
4. **Passerelle** : aucun nouveau préfixe si les routes sont déjà sous `/serveurs-jeux` et `/web-instances` (relais **`all("*")`** existants). Vérifier que le corps JSON est bien relayé (method POST, Content-Type).

### A.3 Critères d’acceptation Phase A

- `curl` authentifié vers la passerelle : `POST /serveurs-jeux/instances/{id}/exec` renvoie le même sens fonctionnel que `POST` moteur direct (codes HTTP cohérents).
- Utilisateur non propriétaire : **403** comme pour les autres routes instance.
- Aucune route nouvelle sur `/containers` côté gateway pour les utilisateurs finaux si l’objectif reste « par instance » ; réserver `/containers/.../exec` gateway **uniquement** si le cœur Docker du panel en a besoin (voir Phase E / lab).

---

## Phase B — Interface console : saisie reliée à Phase A

### B.1 Objectif

Remplacer l’état « désactivé » de `ConsoleFluxInstance` par une saisie fonctionnelle **minimaliste** : une ligne envoyée → réponse affichée (stdout/stderr + code).

### B.2 Étapes strictes

1. Étendre **`ConsoleFluxInstance`** pour accepter des props optionnelles :
   - `modeSaisie: "desactivee" | "execLigne"` ;
   - callbacks `surEnvoyerCommande(texte: string) => Promise<void>` ou équivalent ;
   - état chargement / erreur d’envoi.
   - Garder la section flux SSE **inchangée** dans un premier temps (les logs restent en parallèle de la zone commande).
2. Créer un petit hook ou service passerelle **`apps/web/src/passerelle/`** (pattern existant `client-http-authentifie-passerelle.ts`) :  
   `posterExecInstanceServeur(idInstance, corps)` → `POST ${base}/serveurs-jeux/instances/${id}/exec`.  
   Même chose pour web si réutilisation du composant.
3. **`ConsoleServeur`** : passer `modeSaisie="execLigne"` lorsque `actif` et instance possède un conteneur (optionnellement désactiver si statut sans `containerId` — aligné détail instance).
4. **`ConsoleWebInstance`** : symétrique vers `/web-instances/.../exec`.
5. Tests manuels : serveur Minecraft déjà créé → commande type `/bin/sh -c "echo test"` ou commande métier documentée pour l’image.

### B.3 Critères d’acceptation Phase B

- L’utilisateur voit distinctement **flux Docker** et **résultat des commandes** (deux zones ou préfixes de lignes).
- Pas de fuite d’identifiant Docker dans l’UI : tout passe par **id instance**.

---

## Phase C — Terminal interactif « direct » (PTY + flux continu)

### C.1 Constat technique

L’exec actuel (`exec-commande-conteneur-docker.service.ts`) est **terminé après sortie** ; `Tty: false`. Un vrai terminal nécessite `Tty: true`, flux bidirectionnel durable, gestion fenêtre (**SIGWINCH** optionnel).

### C.2 Étapes strictes

1. **container-engine** : nouveau module dédié (sans gonfler `exec-commande-conteneur-docker.service.ts` au-delà de la limite de lignes) pour :
   - créer une session exec avec **AttachStdin/Stdout/Stderr + Tty** ;
   - exposer soit **WebSocket** soit **SSE bidirectionnel** (WebSocket préférable pour binaire stdin).  
   Nouvelle route **uniquement** sous `services/container-engine`, avec validation `id` conteneur existant.
2. **Passerelle** : relais **Upgrade WebSocket** vers le moteur.  
   Point d’attention : `container-engine-proxy.ts` filtre certains en-têtes hop-by-hop (`upgrade` listé ligne 16). Il faudra une **route spécialisée** qui préserve le mécanisme WebSocket end-to-end (documenter le comportement exact après implémentation).
3. **Services métier** : même schéma que Phase A — **pas** d’accès WebSocket client → Docker direct ; le client ouvre WS vers une URL **`/serveurs-jeux/instances/:id/console`** (nom à figer dans `packages/`) qui vérifie l’instance puis proxifie vers le moteur avec **id Docker résolu**.
4. **Frontend** : bibliothèque terminal (ex. xterm.js) dans **`apps/web`** uniquement ; composant séparé **≤ 300 lignes** (ex. `TerminalInteractifInstance.tsx`).

### C.3 Critères d’acceptation Phase C

- Session interactive stable pendant plusieurs minutes ; Ctrl+C géré selon capacités PTY.
- Arrêt conteneur : fermeture propre WS + message UI.

---

## Phase D — Comportement par type d’instance (Minecraft, SQL, Docker générique)

### D.1 Objectif

Une même UI peut ouvrir **plusieurs stratégies** selon le gabarit (`gameType` / stack web / métadonnées catalogue).

### D.2 Étapes strictes

1. **`packages/container-catalog`** (ou `packages/database` si métadonnées déjà centralisées) : ajouter un champ discriminant **documenté** (ex. `modeConsolePrefere: "shell" | "rcon" | "client_sql" | "logs_uniquement"`).
2. **Minecraft Java** : si l’image supporte **RCON**, ajouter variables env catalogue + service optionnel d’envoi RCON (nouveau petit module dans **server-service**, pas dans le gateway) — **ne pas** confondre avec un PTY shell si l’objectif est les commandes `/whitelist`, etc.
3. **Bases SQL** : pour images avec `psql` / `mysql` CLI, Phase B/C suffit pour taper du SQL **dans le client en ligne** ; alternative UX : formulaire « requête SQL » qui appelle Phase A avec `cmd` adaptée (lecture seule possible via garde-fou métier ultérieur).
4. Documenter dans **Lore.md** chaque décision produit (par exemple « RCON obligatoire pour telle image »).

### D.3 Critères d’acceptation Phase D

- Carte ou détail instance affiche le **mode console effectif**.
- Gabarit sans shell utilisable : message explicite au lieu d’un terminal cassé.

---

## Phase E — Gestionnaire de fichiers (import / export / CRUD)

### E.1 Objectif

Opérer sur les fichiers **à l’intérieur du conteneur** (volumes de jeu/données), sans SSH hôte.

### E.2 Étapes strictes (implémentation moteur d’abord)

1. **container-engine** : nouvelles routes REST (préfixe à fixer, ex. `/containers/:id/fs/...`) utilisant exclusivement API Docker :
   - **liste** : `exec` + commande contrôlée (`find`/`ls`) ou inspection montages + chemins autorisés ;
   - **lecture / écriture** : petits fichiers via **archive temporaire** ou API **`getArchive`/`putArchive`** dockerode si disponible dans votre version ;
   - **suppression** : avec confirmation côté UI ;
   - **export/import** : téléchargement/upload HTTP multipart côté passerelle, corps relayé au moteur.
2. **Contrainte sécurité** : liste blanche de **préfixes de chemins** par type de gabarit (stockée côté catalogue ou renvoyée à la création). Rejeter toute traversée (`..`).
3. **server-service / web-service** : routes **`/instances/:id/fs/...`** qui résolvent `containerId` comme Phase A.
4. **apps/web** : nouvelle vue ou onglet « Fichiers » sur `PageDetailServeur` / détail web, réutilisant composants liste existants du design system (`kp-*`).

### E.3 Critères d’acceptation Phase E

- Aucune opération fichier sans **même contrôle d’accès** que les routes instance.
- Fichier volumineux : soit plafond clair (413), soit export par **streaming** documenté.

---

## 2. Suivi qualité obligatoire

Après **chaque phase** :

1. `pnpm run typecheck` (ou équivalent monorepo du dépôt).
2. Vérifier **limite 300 lignes** sur tout fichier touché.
3. Ajouter une entrée datée dans **`Lore.md`** (contexte + pourquoi).
4. Ne pas introduire de commentaires en anglais dans le code (règle projet).

---

## 3. Hors périmètre volontaire (à trancher plus tard)

- Exécution de commandes **sur l’hôte** Linux (hors conteneur).
- Contournement du JWT ou partage public de consoles.
- Édition de fichiers binaires très lourds sans stratégie de chunked claire.

---

*Document généré pour cadrer le chantier « console + fichiers » sur l’état du dépôt au moment de sa rédaction ; mettre à jour les chemins si le code est déplacé.*
