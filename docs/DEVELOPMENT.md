# Development

## Start locally

Use Node.js 24 and pnpm 12. Copy `.env.example` to a local `.env`; never commit
or share the real file.

```bash
pnpm install --frozen-lockfile
pnpm dev:infra
pnpm db:migrate
pnpm dev
```

The default ports are web 3000, API 3001 and PostgreSQL 5433. `pnpm run setup`
starts infrastructure and applies guarded migrations; it does not seed.
`pnpm dev:down` stops services without deleting the database volume.

## Languages and public paths

Edit `packages/i18n/messages/<locale>.json` for UI and email copy and
`packages/i18n/routing.json` for public paths. Supported languages and the
default are in `packages/i18n/project.inlang/settings.json`. Internal routes
and API paths stay English. Rebuild generated types after changing catalogs:

```bash
pnpm --filter @workspace/i18n build
```

## Checks and generated API

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
```

Fast checks need no database. Integration and E2E use owned temporary
infrastructure and require Docker; install their browser with
`pnpm --filter @workspace/api exec playwright install chromium`.
`docs:check` validates documentation links; `project:check` checks project
boundaries and configuration. After changing Nest controllers or DTOs, run
`pnpm api:generate` and include the generated API schema and web client types.
`pnpm api:check` verifies drift without a database or SMTP connection.

## Local data and email

Migration and seed commands refuse staging, production and remote or
unverified databases. Enable fixture mode locally before running:

```bash
pnpm db:seed -- --scenario auth
pnpm db:seed -- --all
pnpm db:seed -- --scenario auth --clean
```

The auth scenario supplies two reference accounts and 60 sample profiles.
Fixture configuration lives in `apps/api/src/seeds/auth/fixtures.config.ts`.
Clean fixtures with the old configuration before changing their IDs or count;
cleanup recognizes only its own records. The initial migration is an auth-only
baseline and does not apply to databases from an older migration history.

Development email goes to Mailpit on SMTP 1025, with its UI at
`http://localhost:8025`. Production SMTP needs explicit credentials, sender
and TLS. Staging SMTP is opt-in and uses an exact recipient allowlist. New
passwords are checked with Have I Been Pwned only in staging/production; allow
outbound HTTPS to `api.pwnedpasswords.com` there. Development/tests stay
offline.

## Reusing cursor pagination

Define the response and bounded query in `packages/contracts`, use a unique
stable order and `limit + 1` rows with `createCursorPage` in the API, then
regenerate OpenAPI. In the web app, use `useCursorInfiniteQuery`, include page
size and filters in the query key, and forward the abort signal. The users
feature is the working example.

## Logs and health

Development logs are readable; staging/production require JSON stdout.
Responses carry `x-request-id`. HTTP logs omit headers, bodies, cookies,
tokens and personal data. Liveness does not contact dependencies; readiness
checks PostgreSQL and enabled Valkey. Configure proxy trust only for a verified
proxy chain.

For local Grafana/Loki/Alloy inspection, run:

```bash
pnpm logs:up
pnpm dev:logs
pnpm logs:test
pnpm logs:down
```

`dev:logs` runs the application with a JSON mirror at
`output/logs/api.jsonl`; Grafana is at `http://localhost:3002` by default.
The mirror has no automatic rotation. `logs:test` uses owned temporary
containers and verifies real HTTP ingestion. The local stack is for
development and has no authenticated Grafana/Loki endpoint.

`compose.logs-collector.yml` is a separate collector fragment for an external
Loki backend. It requires `APP_ENV=staging|production` and the full `LOKI_URL`;
`LOKI_TOKEN_FILE` and `LOKI_TENANT_ID` are optional. Opt-in API containers need
`skull.logs=true` and `skull.logs.environment=APP_ENV` labels and JSON stdout.
The platform must supply secure access, retention and backups. Validate the
fragment and local collector behavior without contacting that backend:

Docker socket access gives the collector broad host privileges, even with a
read-only mount. Run it only on a trusted platform; environment labels filter
logs but do not grant access control.

```bash
APP_ENV=staging LOKI_URL=https://logs.example.invalid/loki/api/v1/push \
  docker compose --env-file /dev/null -f compose.logs-collector.yml config --quiet
pnpm logs:test:docker
```

## Optional shared quotas

The base API needs no Valkey. Start its independent local service, then enable
the API with `VALKEY_ENABLED=true` and a loopback `VALKEY_URL`. Keep
`VALKEY_NAMESPACE` distinct per application/environment and identical across
replicas. The local service is ephemeral and has no authentication; deployed
Valkey needs platform-managed access and availability.

```bash
pnpm valkey:up
pnpm valkey:test
pnpm valkey:down
```

Enabled Valkey is required at startup and for readiness. Failed quota checks
return 503. Better Auth rate limits and sessions remain in PostgreSQL.

## Git worktrees

```bash
pnpm worktree:create
pnpm worktree:remove
pnpm worktree:check
```

Create and remove accept a branch name interactively or as an argument. Paths
live under the ignored `.worktree/` directory of the main checkout. Creation
checks out an existing local branch or starts a new one at main checkout HEAD.
Removal must run outside the target worktree and preserves its branch; Git
refuses dirty or locked worktrees. Dependencies and local env files are not
copied into a new checkout.
