# Development

## Local environment

Use Node.js 24 and pnpm 12. Copy `.env.example` to `.env` for local development;
never commit or share the real file.

```bash
pnpm install --frozen-lockfile
pnpm dev:infra
pnpm db:migrate
pnpm dev
```

API port is 3001, web 3000 and PostgreSQL 5433 by default. `pnpm dev:down` stops
services without deleting the volume. `pnpm run setup` starts infrastructure
and applies guarded migrations; it never seeds implicitly.

## Language profiles and archives

The maintainer repository offers three profiles:

| Profile        | Interface and email | Public routes                  | Documentation |
| -------------- | ------------------- | ------------------------------ | ------------- |
| `en`           | English             | `/sign-in`                     | English       |
| `fr`           | French              | `/connexion`                   | French        |
| `multilingual` | English + French    | `/en/sign-in`, `/fr/connexion` | English       |

```bash
pnpm template:create -- --profile en --output output/english-app
pnpm template:create -- --profile fr --output output/french-app
pnpm template:create -- --profile multilingual --output output/bilingual-app
pnpm template:check
pnpm template:archives
```

The default profile is `en`. The multilingual profile defaults to English;
the URL selects the active language. `scripts/template-profiles.mjs` defines
the three profiles for generation, archives and CI. There are no independent
documentation options or arbitrary locale combinations.

Generation checks message and route coverage before creating output, creates
missing parent directories and refuses existing output directories. It never
reads real environment files or connects to a database. Generated projects omit
source packs, template tooling, Git history, dependencies and caches. Install
dependencies normally before building. ZIPs are written to `output/templates`
and contain the project files directly, including required dotfiles; a Git clone
includes all source packs. `pnpm template:archives -- --profile fr --output output/dist`
generates only the French ZIP. The command uses Node.js and requires no external
archive utility. Existing project directories and ZIP files are never overwritten.

Internal routes stay English. To translate a page pathname, add its public path
to `template/locales/fr/routes.json` in the maintainer repository. In a generated
application, edit `packages/i18n/routing.json`. Every configured internal path
needs a mapping for each active language. Paraglide rewrites the URLs at the router
boundary without duplicating pages, preserving query parameters and fragments.
The shared configuration checks coverage and duplicate paths; pattern handling
belongs to Paraglide. Keep specific mappings before the final fallback.

Interface and email text comes from the same catalogs. Auth callbacks retain
the URL language. API endpoints and data are not translated.

## Validation

```bash
pnpm check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm docs:check
pnpm project:check
pnpm test:integration
pnpm test:e2e
pnpm api:generate
pnpm api:check
```

`api:generate` rebuilds `apps/api/openapi.json` and the generated web client
schema after controller/DTO changes; commit both artifacts. `api:check`
compares temporary output with the checked-in contract without DB, secrets or
SMTP. Swagger at `http://localhost:3001/docs` is not mounted in production.
`docs:check` verifies eight documents and local links. `project:check` verifies
web/server boundaries, private metadata and infrastructure pins. Fast tests need
no DB or real secret. The initial migration is an auth-only baseline and is not
compatible with databases created by an older migration history.

## Migrations and fixtures

Before importing the DB client, migration/seed CLIs require development mode,
a loopback host and values matching Compose's database, user, password and port
(defaults from `.env.example`). Tests require `skull_auth_test`, dedicated
credentials and the harness ownership identifier. Staging/production are refused.

```bash
pnpm db:seed -- --scenario auth
pnpm db:seed -- --all
pnpm db:seed -- --scenario auth --clean
```

Fixture mode must be explicitly enabled. Auth recreates `verified@example.test`
and `unverified@example.test` plus 60 deterministic Faker profiles, seed 20260926,
with unique `example.test` emails and public local password
`Local-Only-Auth-2026!`. These 62 accounts cover four pages. Reference fixture
names/IDs remain stable. Password hashing is sequential to bound memory.
Recognized fixtures are replaced transactionally, without durable sessions.
Reserved emails/IDs occupied by nonmatching accounts are refused before mutation.
All selected scenarios prepare before the first write; cleanup runs in reverse
registry order and deletes only recognized fixtures and their auth dependencies.
Change fixture settings in `apps/api/src/seeds/auth/fixtures.config.ts`. Changes
to seed/domain affect signatures; shrinking the count leaves old reservations
outside the selection. Clean with the old settings before changing them.

## Adding cursor pagination

1. Define a response with `cursorPageSchema` in contracts.
2. Validate query parameters with `cursorPaginationSchema` in a Nest DTO.
3. Use a unique stable order, matching cursor predicate and `limit + 1` rows;
   call `createCursorPage(rows, limit, cursorOf)`.
4. Run `pnpm api:generate`.
5. Use `useCursorInfiniteQuery`, include page size/filters in the query key,
   use the private prefix for session data, and forward cursor and abort signal.

The full example lives in API/web users features. Native selection, enabled,
staleTime and other observer options remain available. There is no total count
or random-page access. API bounds live in pagination constraints; dashboard
size in users config. Keep the latter within contract bounds.

## Email

Mailpit defaults to SMTP 1025 and UI `http://localhost:8025`; adjust the Mailpit
ports and API SMTP_PORT together. Compose has no external relay. APP_ENV is
separate from NODE_ENV: development/staging default to capture, tests to memory.
Production requires explicit SMTP credentials, sender and TLS. Staging real SMTP
is opt-in with exact comma-separated allowed recipients; missing addresses are
refused, not rewritten. Email rendering receives an explicit supported locale
from the verified callback origin, defaulting to the project's base locale.

## Owned integration and E2E

```bash
pnpm --filter @workspace/api exec playwright install chromium
pnpm test:integration
pnpm test:e2e
```

Unit tests live in each package/application's `test/unit`. API integration and
E2E have separate configs and suffixes. The shared harness creates UUID Compose
projects with tmpfs PostgreSQL, non-relaying Mailpit and dynamic loopback ports.
It does not read `.env`, touch dev volumes or accept arbitrary DB URLs. Each run
applies guarded migrations and seeds twice. Shutdown removes only owned services.
`AUTH_TEST_LOCALE` can select a supported locale for a multilingual E2E run.
Mobile browser captures are saved in `output/playwright`. Vite uses `envDir:
false` and reserved test ports. Docker must work and download pinned images.
Auth steps share one identity deliberately; independent feature tests must own
their data and not depend on file order. Browser tests use canonical routes and
localized public paths, exercising the selected project's profile.

## Logging, health and quotas

Development logs are readable; deployed logs are JSON. Each response has
`x-request-id`. Logs include method, path without query, status and duration,
excluding headers, bodies, cookies, tokens, email addresses, IPs, action URLs
and SMTP messages. Live health contacts no service; readiness probes PostgreSQL
with a two-second deadline and returns 503 on failure.
Nest peer tracking trusts only the socket, normalizes IPv6 and ignores client
forwarded headers. Configure trust proxy only for a verified proxy chain and
adapt tracking explicitly. Nest quotas are per process; replicas need a shared
compatible store. Better Auth keeps its independent PostgreSQL rate limits.

## CI and secret scanning

CI uses Node 24.21.0 and pnpm 12.4.1, SHA-pinned actions and versioned images.
Independent jobs run secret scanning, quality, integration and E2E; service tests
own ephemeral infrastructure. Gitleaks 8.30.1 is downloaded from its official
release, verified with SHA-256 and scans complete Git history with redaction.
The template distribution workflow tests the generator and the three profiles
defined in `scripts/template-profiles.mjs`. It creates source ZIPs, extracts them,
then runs `pnpm check`, integration and E2E in every active language against the
extracted projects. ZIPs are uploaded directly, without ZIP-in-ZIP wrapping.
Generated application CI is copied unchanged; distribution tests stay in the
maintainer-only workflow.

## Publishing template releases

PRs and `Run workflow` perform validation and provide downloadable artifacts.
Only pushing a `v*` tag publishes a release, after all three profiles succeed.
Choose a new version on the intended commit, normally the merged `main`:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The example version must be unused. The release contains `webapp-skull-en.zip`,
`webapp-skull-fr.zip` and `webapp-skull-multilingual.zip`. Download those assets;
GitHub's automatic `Source code` archives contain the maintainer repository.

Only the tag publication job has repository write access. It verifies the remote
tag exists, downloads the tested ZIPs, checks archive integrity, creates a draft,
uploads all assets, then publishes it with generated release notes. A failed
upload leaves a draft rather than publishing an incomplete release. Existing
releases are not overwritten; inspect an existing draft before retrying a failed
publication. No npm package is published.

## Inspect logs with Grafana

From the checkout root, on Linux/WSL with Docker available:

```bash
pnpm logs:up
pnpm dev:logs
```

`dev:logs` replaces `pnpm dev` for this session and uses `LOG_FORMAT=json` with
an absolute mirror path at `output/logs/api.jsonl`. Logging Compose commands do
not load environment files; the application keeps its usual local configuration.
Open [Grafana](http://localhost:3002) and the "Skull API logs" dashboard or Loki
Explore. Default ports are Grafana 3002, Loki 3100 and Alloy 12345, bound to
127.0.0.1. Set shell variables `GRAFANA_PORT`, `LOKI_PORT` or `ALLOY_PORT` to
change them.

```logql
{service_name="skull-api",environment="development"} | json
{service_name="skull-api",environment="development"} | json | level >= 50
{service_name="skull-api",environment="development"} | json | request_requestId="RESPONSE_REQUEST_ID"
```

`LOG_LEVEL` accepts trace/debug/info/warn/error/fatal/silent; defaults are debug
outside production and info in production. `LOG_FORMAT` accepts json/pretty,
with pretty as the development default and JSON required outside development.
`LOG_FILE` is a development-only JSON mirror. Web and build logs are not
collected. The mirror has no automatic rotation: stop `dev:logs` and remove
`output/logs/api.jsonl` between long sessions. Loki retention does not purge it.

```bash
pnpm logs:test
pnpm logs:down
```

`logs:test` builds the API, starts an owned Compose UUID project with dynamic
ports, and runs Nest with inert providers. It verifies HTTP 200/500, request
IDs, Nest error context, no leaked secrets or duplicate HTTP logs, Loki ingestion
and Grafana reads. It uses no database or environment file and cleans up its
containers, volumes and temporary files. `logs:down` stops the local stack
while preserving its volumes.

The Compose stack is for development: Grafana allows anonymous local reads
and Loki has no authentication. Staging/production integration is prepared in
the standalone collector fragment below; its backend and platform are not deployed.
Local filesystem storage provides neither high availability nor external backup.

## Staging/production integration contract

`compose.logs-collector.yml` defines only Alloy, with no published host ports.
It does not start the application, database, Loki or Grafana. Project names and
collection position volumes are distinct per `APP_ENV`.

| Setting           | Contract                                       |
| ----------------- | ---------------------------------------------- |
| `APP_ENV`         | staging or production, required; match the API |
| `LOKI_URL`        | Full Loki push URL, required; normally HTTPS   |
| `LOKI_TOKEN_FILE` | Optional token path inside the container       |
| `LOKI_TENANT_ID`  | Optional tenant configured by the backend      |

For Bearer authentication, the target platform mounts its secret read-only
into Alloy (for example at `/run/secrets/loki-token`) and supplies that path
through `LOKI_TOKEN_FILE`. Without a token, use an appropriate private endpoint.
No secret is committed. For Basic Auth, OAuth or a private CA, adapt only
the endpoint/tls_config blocks according to the
[Alloy documentation](https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/).
Standard TLS verification remains enabled.

The future API deployment supplies this configuration (its image and start
command remain application deployment responsibilities):

```yaml
services:
  api:
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

Leave `LOG_FILE` unset outside development. The JSON service_name remains
`skull-api` regardless of the Compose service name. Both labels are required;
other projects on the daemon are collected only if they explicitly opt in.
Docker socket access grants high privileges even when mounted read-only;
reserve it for a trusted collector. The platform owns authenticated access,
TLS, backups, storage/retention and disk monitoring. Environment labels are
filters, not permission isolation.

Validate locally without starting an environment or loading an env file:

```bash
APP_ENV=staging LOKI_URL=https://logs.example.invalid/loki/api/v1/push \
  docker compose --env-file /dev/null -f compose.logs-collector.yml config --quiet
pnpm logs:test:docker
```

`logs:test:docker` uses owned ephemeral local containers and dynamic ports.
It checks opt-in collection, exclusion of another environment and stable API
labels despite a renamed Compose service, with reads through Grafana.
It contacts no staging/production destination and cleans up its resources.
The existing `logs:test` separately verifies the file collection flow.
