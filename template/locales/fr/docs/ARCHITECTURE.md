# Architecture

## Dépendances

```text
apps/web ───────────────→ packages/contracts, packages/ui
apps/web ───────────────→ openapi-fetch + contrat généré
apps/api ───────────────→ packages/contracts, packages/database
packages/database ──────→ Drizzle ORM, PostgreSQL
packages/core ──────────→ aucune technologie applicative
```

NestJS compose l'API. Express reçoit les requêtes HTTP ; le handler officiel
Better Auth est monté sous `/api/auth` avant le parseur JSON Nest. Un guard
global protège les controllers Nest, sauf ceux marqués publics. Les routes de
santé `/health/live` et `/health/ready` sont publiques.

Un second guard global Nest Throttler limite les controllers par pair réseau.
Express ne faisant confiance à aucun proxy, l’adresse vient du socket et les
en-têtes clients tels que `X-Forwarded-For` sont ignorés. Le tracker natif
normalise aussi les sous-réseaux IPv6. `@RateLimit` remplace le quota sur un
controller ou une méthode et documente la réponse 429 ; `@SkipRateLimit` exclut
les sondes de santé. Son stockage est en mémoire, isolé par processus. Une
future exécution multi-instance devra injecter un stockage partagé dans
`ThrottlerModule`, sans modifier les controllers.

`GET /api/me` utilise `@CurrentUser()` pour lire l'identité attachée par le
guard. Il expose seulement `id`, `name`, `email` et `emailVerified`. Le pipe
Zod global valide les DTO d'entrée et l'intercepteur Zod vérifie les réponses.
Le filtre HTTP transforme les erreurs applicatives dans une enveloppe stable
avec un identifiant de requête, sans exposer les données invalides. Le handler
Express Better Auth conserve ses propres réponses.

L'OpenAPI est produit depuis les controllers de l'application avec un handler
auth et un lecteur de session inertes. Cette composition n'importe pas le
client de base de données et ne contacte aucun service. `openapi-typescript`
génère ensuite les types consommés par `openapi-fetch` dans le web. Le contrôle
de dérive compare les fichiers générés à des fichiers temporaires, sans lire
l'index Git.

Better Auth possède les utilisateurs, comptes et sessions. Ces objets ne sont
pas dupliqués dans un faux domaine. `packages/core` possède le port pur `EmailSender`.

## Placement du code

- Controller, guard et composition HTTP : `apps/api/src`.
- Code propre à une fonctionnalité web : `apps/web/src/features/<feature>`.
- Client et configuration transversaux : `apps/web/src/lib`.
- Schémas échangés aux frontières : `packages/contracts`.
- Persistance Drizzle : `packages/database`.
- Primitive visuelle partagée : `packages/ui`.

Les fichiers de règles de validation portent le suffixe `.constraints.ts` ;
les réglages techniques gardent `.config.ts` ou leur module `config.ts`. Les
bornes du mot de passe sont possédées par le contrat auth partagé et appliquées
explicitement par Better Auth et le formulaire. Les durées des jetons auth
appartiennent au même contrat : Better Auth les convertit en secondes et
`packages/email` les utilise pour annoncer leur expiration.

Les constantes restent auprès de leur propriétaire : contraintes de formulaire
dans la feature web, réglages PostgreSQL dans `packages/database`, configuration
OpenAPI dans l'API, valeurs par défaut HTTP et readiness dans
`apps/api/src/config/api.config.ts`, cache web dans
`apps/web/src/lib/query/query.config.ts`. `packages/config` ne partage à l'exécution que l'identité
publique du produit ; `packages/contracts` décrit les données échangées, pas les
réglages d'infrastructure. Le nom du cookie documenté appartient à l'intégration
Better Auth et ne constitue pas un réglage public du projet.

Les imports serveur utilisent NodeNext et des extensions `.js` explicites dans
le TypeScript. Le web utilise le mode de résolution Bundler.
L'identité publique est un fichier JSON importé avec l'attribut `type: json`.
TypeScript infère sa structure via `resolveJsonModule`. Les interfaces des
contrats applicatifs sont explicites et leurs schémas sont vérifiés avec
`satisfies z.ZodType<Contrat>`. Les configurations techniques restent
dans leurs modules TypeScript et les valeurs de déploiement à la frontière env.

Le web lit l'URL publique uniquement depuis `apps/web/src/lib/api/config.ts`.
Le client OpenAPI envoie les cookies avec chaque requête. L'accueil désactive
son chargement SSR et redirige vers la connexion lorsque `/api/me` répond 401
ou 403. L'entrée sur cette route force une nouvelle vérification de `/api/me`,
même si l'identité en cache est encore fraîche. Toute transition d'identité
annule puis retire les queries préfixées `private` (identité incluse), afin
qu’aucune donnée privée d’un utilisateur précédent ne reste visible. Les queries
publiques conservent leurs données et leurs requêtes en cours.

## Pagination des utilisateurs

`GET /api/users` passe par les guards globaux de session vérifiée et de quota.
Tous les comptes admissibles peuvent lire les noms, emails et statuts de
vérification de la liste d’exemple ; les comptes, sessions et hashes sont exclus.
Le DTO valide `cursor` (identifiant non vide, 256 caractères maximum) et `limit`
(entier entre 1 et 100, 20 par défaut) via les contrats partagés.

La requête Drizzle sélectionne les quatre champs publics, trie par `user.id`
unique croissant et applique `id > cursor`, avec `limit + 1` lignes. Le helper
serveur retire la ligne de contrôle et renvoie `{ items, nextCursor }`, avec
`null` en fin de liste. Le curseur est l’identifiant de la dernière ligne visible ;
il n’exige pas que cette ligne existe encore. La pagination ne fige pas un
snapshot : des insertions avant le curseur nécessitent un rechargement.
Le lecteur est injecté dans la composition API ; la génération OpenAPI injecte
un lecteur inerte sans connexion DB. Le token d’injection et le type du lecteur
restent dans `users.types.ts`, sans import runtime de l’adaptateur Drizzle.

Les bornes et la valeur par défaut appartiennent à
`packages/contracts/src/pagination.constraints.ts`. La taille d’affichage est
choisie dans `features/users/users.config.ts` et passée à la requête ainsi
qu’à TanStack Table ; elle reprend par défaut la valeur du contrat. Les réglages
Faker sont possédés par `seeds/auth/fixtures.config.ts`.

Le hook transverse configure `initialPageParam` et `getNextPageParam` pour
`useInfiniteQuery` et conserve les options TanStack Query. La feature utilisateurs
possède la clé privée incluant la taille de page, la requête OpenAPI et son signal
d’annulation. TanStack Table affiche une seule page en pagination manuelle ;
Le hook `useUsersTable` possède la navigation, les handlers et le modèle de table ;
les composants séparent composition, rendu des lignes, navigation et feedback.
Suivant charge si nécessaire et Précédent utilise le cache. Réessayer après une
erreur de page suivante charge cette page et y navigue après succès. Les changements
d’identité purgent ces pages avec les autres queries privées.

## Santé

La liveness indique seulement que le processus répond. La readiness exécute
`select 1` sur PostgreSQL et retourne 503 si la requête échoue ou dépasse deux
secondes. Elle ne sonde pas le transport email et ne divulgue aucun détail de
connexion.

## Journaux et arrêt

Un middleware Pino placé avant CORS et Better Auth crée l’identifiant de requête.
Il le renvoie dans `x-request-id`, le lie aux logs Nest et le transmet au
dispatcher email. Le log HTTP contient méthode, chemin sans query, statut et
durée. Les headers, bodies, cookies, tokens, emails, IP, URLs d’action et messages
fournisseur n’en font pas partie ; la redaction Pino forme une seconde barrière.
Le développement utilise `pino-pretty`, tandis que staging et production restent
en JSON.

À SIGINT ou SIGTERM, le serveur cesse d’accepter des requêtes, le dispatcher
attend les emails suivis au plus 15 secondes, puis la connexion PostgreSQL est
fermée.

## Migrations et fixtures

Les commandes d’écriture vérifient `APP_ENV`, le protocole, l’hôte loopback et
la concordance de la cible avec `POSTGRES_DB`, `POSTGRES_USER`,
`POSTGRES_PASSWORD` et `POSTGRES_PORT` avant de charger le client PostgreSQL.
Leurs valeurs par défaut restent celles de `.env.example`. Les tests exigent
les identifiants dédiés et un identifiant d’environnement
éphémère possédé ; le seed exige le mode fixture `enabled`. Aucun migrateur ou
seed ne s’exécute au démarrage de l’API.

Le scénario auth contient deux comptes de référence et 60 profils français Faker
avec une graine fixe, des IDs réservés et des emails uniques `example.test`. Le hachage passe par
l’API publique `better-auth/crypto`. Le registre ordonné prépare tous les
scénarios sélectionnés avant la première mutation, puis les exécute dans l’ordre
déclaré ; le nettoyage utilise l’ordre inverse. Une relance reconnaît les IDs
utilisateur et compte réservés ainsi que la signature Better Auth complète. Elle
remplace ensuite les comptes et leurs hashes dans une seule transaction pour
restaurer leurs valeurs. Une collision interrompt toute la sélection avant
mutation. Le scénario auth reste indépendant de Drizzle ; l’adaptateur
`seeds/auth/store.ts` possède les requêtes et transactions,
et le CLI ne fait que composer ces dépendances après la garde de cible.
Le nettoyage optionnel supprime seulement ces 62 comptes reconnus, leurs dépendances
auth et les jetons de réinitialisation dont la valeur référence leur identifiant,
dans une transaction. Il reste explicite.

## Authentification et emails

`createAuth` est une factory sans singleton : le bootstrap injecte la base,
la configuration et le dispatcher email. Le handler reçoit une IP issue du
socket, écrasant l’en-tête interne `x-auth-client-ip` fourni par le client.
Aucun proxy n’est implicitement approuvé ; configurer une chaîne de confiance
précise avant de mettre l’API derrière un reverse proxy. Les clients derrière
un proxy partagent actuellement son quota réseau.

Better Auth gère les tokens, mots de passe, sessions et rate limits persistés.
La migration incrémentale `0001` ajoute `rate_limit` à la baseline publiée.
Ce quota reste distinct de celui de Nest : `/api/auth/*` est monté directement
dans Express avant les guards, tandis que les controllers `/api/*` utilisent le
quota Nest et l’enveloppe d’erreur HTTP commune.
Les callbacks confient les emails au dispatcher sans attendre SMTP. Chaque
promesse est suivie, son erreur traitée sans contenu fournisseur, et l’arrêt
attend les envois au plus 15 secondes. Le transport est borné à 10 secondes.
Un crash peut perdre un envoi, sans retry automatique.

`packages/core` possède `EmailSender` et `EmailMessage` ; `packages/email`
implémente le rendu React Email et SMTP ; l’API compose les adaptateurs selon
`APP_ENV`. Le web n’importe aucun de ces modules serveur.

## Tests des applications

Tous les tests restent sous le dossier `test` de leur application ou package.
Les tests rapides suivent l’arborescence des responsabilités sous `test/unit`,
séparément du code de production. Pour l’API, les tests PostgreSQL/Mailpit et
navigateur vivent sous `test/integration` et `test/e2e`, avec des configurations
Vitest distinctes qui ne sélectionnent que leur suffixe. Le harness commun sous
`test/support` refuse toute base qui n’appartient pas au projet Compose éphémère
courant. La suite d’intégration auth conserve dans un seul fichier les étapes
qui partagent explicitement une identité ; les futures suites indépendantes
doivent posséder leurs propres données.

## Frontend et localisation

Les routes déclarent navigation, métadonnées et composition. Les formulaires
sont dans `features/auth/components`, leur orchestration TanStack Form dans
`features/auth/hooks`, et leurs schémas dans `features/auth/schemas`.
Le header et l’accueil sont des composants indépendants des routes.

`packages/i18n/messages/<locale>.json` contient les catalogues Paraglide sélectionnés pour les écrans et emails.
Le compiler génère fonctions, déclarations et URL localisées ; la stratégie `url` sélectionne la langue et le middleware isole les requêtes SSR. `packages/i18n/src/config.ts` expose la locale
par défaut et les locales supportées depuis ce runtime généré. Le mapping des chemins est dans `packages/i18n/routing.json`.
L’identité publique reste JSON dans `packages/config`, les contraintes sont dans
leurs modules TypeScript.

`packages/i18n/routing-config.mjs` vérifie la couverture des langues et les
doublons de chemins. Le compilateur utilise cette configuration ;
le traitement et l’ordre des patterns restent ceux de Paraglide. La route de
repli arrive en dernier, la query et le fragment sont conservés. Le périmètre
couvre les chemins des pages, sans domaine de contenus traduits.

Dans le profil français, les URL `/connexion`, `/inscription`, `/verification-email`,
`/adresse-confirmee`, `/mot-de-passe-oublie` et `/nouveau-mot-de-passe` sont privées
vis-à-vis de l’indexation. Les routes internes restent anglaises ; la réécriture Paraglide traduit les URL publiques sans dupliquer les pages. Les chemins absolus, encodés ambigus et antislashs ne peuvent
pas servir de retour. Aucun sitemap ou canonical artificiel n’est généré.

Le store rate limit utilise `customStorage.consume` de Better Auth sur la même
base PostgreSQL. L’upsert applique le plafond et l’incrément sous le même verrou
SQL : l’adaptateur Drizzle 1.7.4 utilise un sous-select d’identifiants dont le
prédicat de compteur n’est pas réévalué après attente du verrou. Le test de
requêtes parallèles protège ce correctif. Better Auth conserve les règles, la
normalisation IP et la réponse 429 ; les entrées expirées sont purgées.

La robustesse est calculée localement par zxcvbn-ts dans la feature auth web, avec les dictionnaires commun, anglais et français. Aucun mot de passe n’est envoyé à un service d’évaluation. Le score reste indicatif et ne participe pas à la validation.

## Collecte des journaux

`nestjs-pino` reste l’intégration Nest existante : le middleware Express couvre
également Better Auth et le module Nest ajoute le contexte, sans second log HTTP.
Les logs JSON portent `service_name=skull-api` et `environment=APP_ENV`.
`logging.config.ts` valide format, niveau et miroir local. Staging/production
émettent uniquement sur stdout en JSON ; le miroir fichier est réservé au dev.

`compose.observability.yml` est indépendant de PostgreSQL et Mailpit.
`pnpm dev:logs` conserve stdout et écrit le JSON API dans
`output/logs/api.jsonl`. Alloy monte ce répertoire en lecture seule, conserve
ses positions dans son volume et transmet à Loki. Loki monolithique conserve
ses données et son état de compaction dans un volume, avec rétention de sept
jours. Grafana provisionne la datasource et un dashboard de logs/erreurs.
Seuls service et environnement sont indexés ; requestId reste dans le JSON.

Le fragment `compose.logs-collector.yml` prépare un Alloy autonome par
environnement ; il ne lance ni application, ni Loki/Grafana. Il utilise
`infra/observability/docker.alloy` pour sélectionner les conteneurs marqués
`skull.logs=true` et `skull.logs.environment=APP_ENV`. Le label indexé
`environment` vient du collecteur ; `service_name` vient du JSON applicatif,
avec le service Compose comme fallback. Un renommage du service Compose ne
change donc pas les requêtes Grafana de l’API. `LOKI_URL` désigne la destination
externe ; un token fichier et un tenant sont optionnels. Les positions du
collecteur persistent dans un volume propre au projet/environnement. L’accès au socket Docker donne des
privilèges élevés même avec un montage en lecture seule ; il exige un collecteur
et un hôte de confiance. Aucun socket n’est monté par le Compose local.
