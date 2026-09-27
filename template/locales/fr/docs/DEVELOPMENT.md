# Développement

## Mots de passe compromis

Les contrôles Have I Been Pwned sont activés avec `APP_ENV=staging` ou
`production`, sans clé API ni migration. Autoriser HTTPS sortant vers
`api.pwnedpasswords.com`. Development/test n’effectuent aucun appel. Les tests
unitaires exercent la factory auth réelle avec un adaptateur mémoire et des
réponses HIBP simulées. Le plugin ne configure pas de timeout : la latence du
service peut retarder la soumission. Ces tests ne vérifient pas le réseau de
production.

## Environnement

Utiliser Node.js 24 et pnpm 12. Copier `.env.example` vers `.env` pour le
développement local ; ne jamais versionner ou partager le fichier réel.

```bash
pnpm install --frozen-lockfile
pnpm dev:infra
pnpm db:migrate
pnpm dev
```

L'API écoute sur `3001`, le web sur `3000` et PostgreSQL sur `5433` par défaut.
`pnpm dev:down` arrête les conteneurs sans supprimer le volume.

## Validation

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
pnpm docs:check
pnpm project:check
pnpm test:integration
pnpm test:e2e
pnpm api:generate
pnpm api:check
```

`pnpm api:generate` reconstruit `apps/api/openapi.json` depuis les controllers
Nest puis `apps/web/src/lib/api/schema.d.ts`. Exécuter cette commande après un
changement de controller ou DTO et versionner les deux artefacts.
`pnpm api:check` régénère dans un répertoire temporaire et échoue en cas de
dérive. La génération utilise des providers inertes et ne demande ni base, ni
secret, ni SMTP. Avec l'API locale démarrée, Swagger est disponible sur
`http://localhost:3001/docs`. Cette interface n'est pas montée lorsque
`NODE_ENV=production`.

Les tests rapides n'ont besoin ni d'une base ni d'un secret réel. La migration
initiale est une baseline auth seule ; elle n'est pas compatible avec une base
créée par un ancien historique.

`pnpm docs:check` vérifie la présence des huit documents et leurs liens locaux.
`pnpm project:check` protège les frontières web/serveur, les métadonnées privées,
le retrait des anciennes technologies et les versions des images/actions.

## Migrations et fixtures

`pnpm run setup` exige un `.env` local, démarre les services Compose puis applique
les migrations. Avant de charger le client DB, le CLI exige `APP_ENV=development`,
un hôte loopback et une URL concordant avec les variables Compose `POSTGRES_DB`,
`POSTGRES_USER`, `POSTGRES_PASSWORD` et `POSTGRES_PORT` (valeurs de
`.env.example` par défaut). En test, il exige la base et les identifiants dédiés
`skull_auth_test`, ainsi que l'identifiant d’ownership créé par le harness ; le
port reste dynamique. Staging et production sont toujours refusés par ces outils
locaux.

Le seed n'est jamais implicite :

```bash
pnpm db:seed -- --scenario auth
```

`DATABASE_FIXTURE_MODE=enabled` doit être présent. La commande recrée
`verified@example.test` et `unverified@example.test` avec le mot de passe local
public `Local-Only-Auth-2026!`, ainsi que 60 profils déterministes générés par Faker, indépendants de la langue de l’interface
avec la graine `20260926`, le même mot de passe local et des emails uniques sous
`example.test`. Ces 62 comptes permettent de parcourir quatre pages du dashboard.
Les deux comptes de référence gardent leurs noms et identifiants historiques.
Le hachage est séquentiel pour borner la consommation mémoire.
Elle supprime puis recrée tout compte reconnu par
sa signature afin de restaurer ses valeurs, ne crée aucune session durable
et peut être relancée. Une adresse réservée occupée par un compte ne correspondant
pas exactement à la fixture provoque un refus avant toute mutation.

`pnpm db:seed -- --all` prépare tous les scénarios avant la première écriture,
puis les exécute dans l’ordre du registre. Avec `--clean`, tous les scénarios
sont préparés et nettoyés en ordre inverse. Le scénario auth possède des IDs
réservés stables ; un compte qui reprend seulement son adresse ou son nom reste
une collision. Le hachage Better Auth est terminé avant que la transaction
remplace les utilisateurs et comptes reconnus.

Le nettoyage est volontaire, utilise la même garde et supprime uniquement ces
62 comptes reconnus avec leurs dépendances auth et jetons de réinitialisation, dans
une transaction :

```bash
pnpm db:seed -- --scenario auth --clean
```

## Ajouter une liste paginée

1. Définir la réponse avec `cursorPageSchema(schema)` dans `packages/contracts`.
2. Valider les paramètres avec `cursorPaginationSchema` dans un DTO Nest.
3. Utiliser un ordre unique et stable, le même prédicat de curseur et une lecture
   de `limit + 1` lignes ; appeler `createCursorPage(rows, limit, cursorOf)`.
4. Régénérer OpenAPI avec `pnpm api:generate`.
5. Appeler `useCursorInfiniteQuery` avec la clé de query (préfixe `private` pour
   les données de session), la taille dans la clé, et une `queryFn` qui transmet
   `pageParam` comme curseur et `signal` au client HTTP. Le hook garde les options
   natives (`enabled`, `select`, `staleTime`, etc.).

L’exemple complet est dans `apps/api/src/modules/users` et
`apps/web/src/features/users`. Les options produites par
`cursorInfiniteQueryOptions` peuvent aussi servir au préchargement et aux tests.
Aucun total ni accès direct à une page arbitraire n’est calculé.

Les limites et le défaut de l’API se règlent dans
`packages/contracts/src/pagination.constraints.ts`. La taille d’affichage du
dashboard se règle dans `apps/web/src/features/users/users.config.ts` ; elle
alimente le hook de requête et le modèle TanStack Table. Garder cette taille
dans les bornes du contrat. Le nombre de profils, la graine Faker, le domaine
email et la fréquence des adresses non vérifiées se règlent dans
`apps/api/src/seeds/auth/fixtures.config.ts`. Une modification de graine ou de
domaine change la signature des fixtures ; une réduction du nombre de profils
laisse des anciennes réservations hors de la sélection : nettoyer les anciennes fixtures
avec leur configuration actuelle avant de la modifier, puis relancer le seed.

## Emails locaux

Mailpit écoute par défaut en SMTP sur `1025` et son interface sur
`http://localhost:8025`. Les ports peuvent être ajustés avec
`MAILPIT_SMTP_PORT`/`MAILPIT_HTTP_PORT` ; ajuster aussi `SMTP_PORT` côté API.
Le Compose de développement n’active aucun relais SMTP externe.

`APP_ENV` est distinct de `NODE_ENV`. Développement/staging utilisent la capture
locale par défaut ; test utilise la mémoire. La production exige SMTP, hôte,
expéditeur et identifiants explicites, avec TLS obligatoire. Le SMTP réel staging
est opt-in et nécessite `EMAIL_ALLOWED_RECIPIENTS`, adresses exactes séparées par
virgules ; une adresse absente est refusée, jamais réécrite.

## Intégration isolée

```bash
pnpm --filter @workspace/api exec playwright install chromium
pnpm test:integration
pnpm test:e2e
```

Les tests rapides des applications et packages sont centralisés sous leur
dossier `test/unit`, avec une arborescence qui reflète la responsabilité testée.
Leurs configurations Vitest ne chargent que ces fichiers. Les tests API avec
services réels vivent sous `test/integration` avec le suffixe
`.integration.test.ts` ; les parcours navigateur vivent sous `test/e2e` avec le
suffixe `.e2e.test.ts`. Chaque famille possède sa configuration Vitest.

Le harness crée un projet Compose UUID distinct, PostgreSQL en tmpfs et Mailpit
sans relais, avec ports loopback dynamiques. Il ne lit pas `.env`, n’utilise pas
les volumes dev et n’accepte pas une URL de base arbitraire. Les migrations sont
appliquées seulement à cette base possédée. L’arrêt retire uniquement ce projet.
Chaque commande crée son propre projet Compose UUID, applique la migration gardée
et relance le seed deux fois. `test:integration` couvre DB, sessions, email et
sécurité API ; `test:e2e` exerce le parcours mobile avec captures locales sous
`output/playwright`. Le serveur Vite utilise `envDir: false` et des ports réservés
au test. Docker doit fonctionner et pouvoir télécharger les images versionnées.

Les parcours d’intégration auth restent dans une suite cohésive : vérification,
sessions et reset réutilisent volontairement l’identité créée au début du
parcours. La configuration désactive le parallélisme entre fichiers ; toute
nouvelle feature indépendante doit obtenir son propre fichier et ses propres
données, sans dépendre de l’ordre des fichiers.

## Logs et santé

En développement, les logs Pino sont lisibles ; staging et production émettent
du JSON. Chaque réponse porte `x-request-id`. Les lignes HTTP contiennent méthode,
chemin sans query, statut et durée, sans headers, body, cookie, adresse email, IP,
token, URL d’action ou message SMTP. `/health/live` ne contacte aucun service ;
`/health/ready` sonde PostgreSQL et répond 503 après deux secondes au plus.

## Rate limits

Les controllers Nest utilisent un quota global en mémoire par pair réseau.
Express ne faisant confiance à aucun proxy, l’adresse vient du socket et les
en-têtes `X-Forwarded-For` envoyés par un client ne changent pas le tracker.
Nest Throttler normalise les sous-réseaux IPv6. `/api/me` démontre la surcharge
d’une règle avec `@RateLimit` et les sondes de santé portent `@SkipRateLimit`.
Ne configurer `trust proxy` qu’avec une chaîne de proxies connue et adapter alors
explicitement cette règle.

Le stockage Nest est propre à chaque processus : les quotas ne sont donc pas
agrégés entre plusieurs replicas. Avant un déploiement multi-instance, injecter
un adaptateur de stockage partagé compatible Nest Throttler. `/api/auth/*` ne
passe pas par ce guard et conserve le rate limit PostgreSQL de Better Auth.

## CI

`.github/workflows/ci.yml` utilise Node 24.21.0 et pnpm 12.4.1. Les actions sont
épinglées à des commits et les images à des versions. Quatre jobs sans compte
externe exécutent respectivement la détection de secrets, `pnpm check`,
l'intégration et l'E2E ; ces deux derniers créent leurs propres services
éphémères, jamais le Compose dev.

Le job Gitleaks télécharge le binaire MIT 8.30.1 depuis sa release officielle,
vérifie son archive Linux x64 par SHA-256 et analyse tout l'historique Git. La
même analyse est reproductible localement sur Linux x64 :

```bash
gitleaks_dir="$(mktemp -d)"
trap 'rm -rf "$gitleaks_dir"' EXIT
curl --fail --silent --show-error --location \
  --output "$gitleaks_dir/gitleaks.tar.gz" \
  https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz
echo "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb  $gitleaks_dir/gitleaks.tar.gz" | sha256sum --check --strict
tar --extract --gzip --file "$gitleaks_dir/gitleaks.tar.gz" --directory "$gitleaks_dir" gitleaks
"$gitleaks_dir/gitleaks" git --redact --verbose .
```

## Traductions

Éditer `packages/i18n/messages/<locale>.json` pour la langue concernée, puis exécuter
`pnpm --filter @workspace/i18n build`. Build/typecheck génèrent les fonctions
Paraglide typées ; les sorties ne sont pas versionnées. En mode dev, le watcher
recompile les messages. Conserver les règles de pluriel dans le catalogue.

## Routes publiques

Les langues actives et la langue par défaut sont configurées dans
`packages/i18n/project.inlang/settings.json`. Les routes internes restent anglaises.
Modifier `packages/i18n/routing.json` : chaque chemin interne configuré
doit avoir une correspondance par langue active. Paraglide réécrit les URL à la
frontière du routeur, sans duplication des pages, et conserve query et fragment.
La configuration vérifie couverture et doublons ; Paraglide possède le traitement
des patterns. Les mappings spécifiques précèdent la route de repli finale.

Messages d’interface et emails partagent les catalogues. Les callbacks auth
conservent la langue de l’URL. Les endpoints API et données ne sont pas traduits.

## Tester les logs avec Grafana

Depuis la racine du checkout, sous Linux/WSL avec Docker disponible :

```bash
pnpm logs:up
pnpm dev:logs
```

`dev:logs` remplace `pnpm dev` pendant ce test : il lance la même application
avec `LOG_FORMAT=json` et un miroir absolu dans `output/logs/api.jsonl`.
Les commandes Compose de logs ne chargent aucun fichier `.env` ; le démarrage
habituel de l’application conserve sa configuration locale existante.
Ouvrir [Grafana](http://localhost:3002), puis le dashboard « Skull API logs » ou
Explore avec la datasource Loki. Les ports locaux par défaut sont 3002
(Grafana), 3100 (Loki) et 12345 (Alloy), liés à 127.0.0.1. Les variables de shell
`GRAFANA_PORT`, `LOKI_PORT` et `ALLOY_PORT` permettent de les changer.

Requêtes utiles dans Explore :

```logql
{service_name="skull-api",environment="development"} | json
{service_name="skull-api",environment="development"} | json | level >= 50
{service_name="skull-api",environment="development"} | json | request_requestId="ID_DE_LA_REPONSE"
```

`LOG_LEVEL` accepte trace/debug/info/warn/error/fatal/silent. Le défaut reste
debug hors production et info en production. `LOG_FORMAT` accepte json/pretty,
avec pretty par défaut en dev ; hors dev, seul JSON est autorisé.
`LOG_FILE` est un miroir JSON réservé au développement. Les logs de compilation
et du web ne sont pas collectés. Le fichier local n’a pas de rotation automatique :
arrêter `dev:logs`, puis supprimer `output/logs/api.jsonl` entre les longues
sessions. La rétention Loki de sept jours ne purge pas ce fichier local.

```bash
pnpm logs:test
pnpm logs:down
```

`logs:test` compile l’API, lance un projet Compose UUID et des ports dynamiques,
puis un serveur Nest avec providers inertes. Il vérifie requêtes 200/500,
requestId, contexte des erreurs Nest, absence de secrets et de doublons HTTP,
ingestion Loki et lecture via Grafana. Il ne contacte aucune base et ne lit
aucun `.env`. Ses conteneurs, volumes et fichiers sont supprimés à la fin.
`logs:down` arrête seulement la stack locale et conserve ses volumes.

Cette stack est réservée au développement : Grafana autorise la consultation
anonyme locale et Loki n’a pas d’authentification. Ne pas exposer ces ports en
staging/prod. Le fragment d’intégration décrit ci-dessous prépare ces environnements sans
les déployer. Les accès Grafana/Loki, TLS, sauvegardes, stockage/rétention et
surveillance du disque restent possédés par la plateforme cible.
Un label d’environnement sert à filtrer, pas à isoler les permissions. Le stockage
filesystem local ne fournit pas de haute disponibilité ni de sauvegarde externe.

## Contrat d’intégration staging/prod

`compose.logs-collector.yml` définit uniquement le collecteur Alloy. Il est
indépendant du Compose de développement et ne crée ni application, ni DB,
ni Loki/Grafana. Il n’expose aucun port sur l’hôte. Son nom de projet et son
volume de positions sont distincts selon `APP_ENV` ; fournir staging ou production.

La plateforme fournit ces paramètres au collecteur :

| Paramètre         | Contrat                                                                            |
| ----------------- | ---------------------------------------------------------------------------------- |
| `APP_ENV`         | staging ou production, obligatoire, identique à l’API                              |
| `LOKI_URL`        | URL complète de push, obligatoire, normalement HTTPS                               |
| `LOKI_TOKEN_FILE` | Facultatif : chemin **dans le conteneur** d’un token Bearer monté en lecture seule |
| `LOKI_TENANT_ID`  | Facultatif : tenant configuré par le backend Loki                                  |

Sans token, la connexion ne fournit pas d’authentification : utiliser uniquement
un endpoint privé adapté. Pour un token, la plateforme ajoute le montage secret
au service `alloy`, par exemple `/chemin/gere-par-la-plateforme/token:/run/secrets/loki-token:ro`,
puis configure `LOKI_TOKEN_FILE=/run/secrets/loki-token`. Aucun secret n’est
versionné. Pour Basic Auth, OAuth ou une CA privée, adapter uniquement le bloc
`endpoint`/`tls_config` de `docker.alloy` à la destination choisie, en suivant
[la documentation Alloy](https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/).
La validation TLS standard reste active.

Le futur service API suit ce contrat de composition :

```yaml
services:
  api:
    # L’image et le démarrage sont fournis par le déploiement applicatif.
    environment:
      APP_ENV: ${APP_ENV}
      LOG_FORMAT: json
      LOG_LEVEL: info
    labels:
      skull.logs: "true"
      skull.logs.environment: ${APP_ENV}
    logging:
      driver: local
      options:
        max-size: "10m"
        max-file: "3"
```

Ne pas définir `LOG_FILE` hors développement. Le JSON API conserve
`service_name=skull-api`, quelle que soit la clé du service Compose.
Le collecteur exige les deux labels pour découvrir le conteneur ; il peut
collecter d’autres projets sur le même daemon uniquement s’ils portent ces labels.
Le socket Docker donne des privilèges élevés même en lecture seule : réserver
cet accès au collecteur de confiance de la plateforme.

Validation locale du fragment, sans démarrage ni fichier d’environnement :

```bash
APP_ENV=staging LOKI_URL=https://logs.example.invalid/loki/api/v1/push \
  docker compose --env-file /dev/null -f compose.logs-collector.yml config --quiet
pnpm logs:test:docker
```

`logs:test:docker` utilise exclusivement des ressources Docker locales possédées,
des ports dynamiques et un Loki/Grafana éphémère. Il vérifie la collecte opt-in,
l’exclusion d’un autre environnement et le maintien du label API malgré un service
Compose renommé. Il ne contacte aucune destination staging/prod et nettoie
ses conteneurs/volumes. Ce test et la collecte fichier sont séparés.
