# Développement

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
public `Local-Only-Auth-2026!`. Elle supprime puis recrée tout compte reconnu par
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
deux adresses avec leurs dépendances auth et jetons de réinitialisation, dans
une transaction :

```bash
pnpm db:seed -- --scenario auth --clean
```

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

Éditer `packages/i18n/messages/fr.json`, puis exécuter
`pnpm --filter @workspace/i18n build`. Build/typecheck génèrent les fonctions
Paraglide typées ; les sorties ne sont pas versionnées. En mode dev, le watcher
recompile les messages. Conserver les règles de pluriel dans le catalogue.
