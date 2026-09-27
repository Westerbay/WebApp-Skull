# Architecture

## Boundaries

```text
apps/web → packages/contracts, packages/ui, packages/i18n, OpenAPI client
apps/api → packages/contracts, packages/database, packages/email
packages/database → Drizzle ORM, PostgreSQL
packages/core → no application framework
```

NestJS composes the API. Express mounts the official Better Auth handler under
`/api/auth` before the Nest JSON parser. A global session guard protects Nest
controllers unless marked public. `/health/live` and `/health/ready` are public.
`/api/me` returns only ID, name, email and verification status. Zod validates
inputs and serializes responses; the error filter provides a stable envelope
and request ID without leaking invalid inputs. Better Auth keeps its responses.

Global Nest Throttler uses the socket peer, normalizes IPv6 subnets and ignores
untrusted forwarded headers. `RateLimit` overrides quotas; `SkipRateLimit`
exempts probes. Its process-local store needs replacement before using replicas.
Better Auth uses PostgreSQL `customStorage.consume`: a single upsert checks and
increments under one row lock. This avoids the Drizzle 1.7.4 adapter's stale
predicate after lock contention. Expired counters are purged.

Better Auth owns users, accounts and sessions; these are not copied into a fake
domain model. `packages/core` owns the technology-independent `EmailSender` port.

## Code placement and types

Routes compose navigation, metadata and feature components. Feature hooks own
interactions and state; shared clients and query configuration live in web
`lib`. Contracts contain data schemas, database owns persistence, and UI owns
primitives. Server imports use NodeNext `.js` extensions; web uses Bundler
resolution. Public product identity is JSON in `packages/config`.

Constraints use `.constraints.ts`; technical settings use `.config.ts` or
`config.ts`. Password limits and token lifetimes belong to the auth contract;
Better Auth converts lifetimes to seconds and emails display the same durations.
API defaults and readiness live in `apps/api/src/config/api.config.ts`; shared
web cache defaults in `apps/web/src/lib/query/query.config.ts`.

Validated data types are inferred from their Zod schemas with `z.infer`;
form values use `z.input` to describe values before parsing. Keep explicit
interfaces for props and service ports without runtime validation, and simple
generic types where schema inference would add complexity. Use library-native
types where available; avoid casts, `any`, non-null assertions and derived
utility types in feature code.
Nested functions use named `const` arrow functions. Behavior callbacks are
named before the options or JSX that use them. Prefer `if` for object, array,
JSX and operation choices; reserve ternaries for simple values.

## HTTP contracts and cache

OpenAPI is generated from Nest controllers with inert auth/session providers,
without DB, SMTP or secrets. `openapi-typescript` generates the web client types.
Drift checks use temporary files without inspecting the Git index. Both auth
and OpenAPI clients send session cookies. Web reads the API URL only through
`lib/api/config.ts`.

Private route entry forces a fresh `/api/me` check. Authentication transitions
cancel and remove every query prefixed `private`; public queries remain intact.

## Cursor pagination

`/api/users` requires a verified session and passes rate limiting. It exposes
only ID, name, email and verification status. Inputs accept a nonempty cursor
up to 256 characters and a limit of 1–100, default 20. Drizzle orders by unique
user ID, filters `id > cursor` and reads `limit + 1`. `createCursorPage` removes
the lookahead row and returns the last visible ID or `null` at the end.

`useCursorInfiniteQuery` owns initial/next cursor parameters and preserves
native observer options, selection and cancellation. Query keys include page
size and the private prefix. Users table hooks manage cached navigation and
retry; rendering, columns, feedback and pagination are separate. A retry after
backward navigation still resumes the failed request. No total count or random
page access is calculated. Constraints, feature page size and Faker settings
stay with their owners.

## Localization

Active catalogs are in `packages/i18n/messages/<locale>.json`. Inlang settings
define the default and supported locales. Application code imports the generated
Paraglide runtime, which is built from those settings and catalogs.

English file routes form one stable internal tree. `routing.json` maps each
internal path to public paths. `routing-config.mjs` checks locale coverage and
duplicate paths, then builds patterns for Paraglide; it does not parse or reorder
patterns itself. `compile.mjs` uses this configuration.
The fallback comes last; query parameters and fragments are preserved.
Single-language projects omit prefixes; multilingual projects prefix all
locales. TanStack Router rewrites incoming and outgoing URLs with Paraglide.
The Start server entry uses `paraglideMiddleware`, so concurrent SSR requests
keep independent locale state. HTML `lang` comes from the runtime.

Links and redirects use internal paths. External auth callbacks use
`getLocalizedCallbackUrl`. API email locale is inferred from the callback URL
only when it belongs to the configured web origin; unsupported/invalid values
fall back to the base locale. API paths do not change. Public auth paths are
`/sign-in`, `/sign-up`, `/verify-email`, `/email-verified`, `/forgot-password`
and `/reset-password` before localization. Redirect targets reject external,
ambiguous encoded and backslash paths. Auth metadata remains noindex and
no-referrer; there is no artificial sitemap or canonical.

Localization covers page pathnames; the template includes no translated-content
domain or content-slug storage.

## Email, logging and lifecycle

React Email renders HTML/text with an explicit locale. Production SMTP requires
explicit host, sender, credentials and TLS. Staging SMTP is opt-in and uses an
exact recipient allowlist; recipients are never rewritten. Development captures
messages in Mailpit without a relay; tests use memory or owned capture services.
The dispatcher tracks accepted/failed sends, bounds drainage and reports only
sanitized events. Transport connections are bounded and sockets close on timeout.

Pino logs method, path without query, status and duration. Headers, bodies,
cookies, tokens, emails, IPs, action URLs and SMTP messages are excluded. Requests
have `x-request-id`. Readiness probes PostgreSQL with a two-second deadline.
Shutdown stops traffic, drains email, closes resources and flushes logs.

## Seeds and tests

Migration/seed CLIs guard the target before loading a DB client. Seed scenarios
prepare all inputs before mutation. The registry owns ordering and rejects
unknown or duplicate selections. Reserved fixture signatures detect collisions;
replacement/cleanup is transactional. Reset verification ownership uses the
Better Auth user ID; email verification JWTs are stateless.

Unit tests live under `test/unit` and mirror responsibilities. API integration
and browser tests use separate configurations and filename suffixes. A shared
harness owns UUID Compose projects, tmpfs PostgreSQL, Mailpit and dynamic
loopback ports. It refuses arbitrary DB URLs and never touches dev volumes or
`.env`. Auth journey steps deliberately share one identity within one suite;
independent future suites must own their data. Each run seeds twice and cleans
up its owned services. Secret scanning examines all Git history.

Password strength uses local zxcvbn dictionaries; passwords never leave the
browser for scoring and the score does not participate in validation.

## Log collection

The existing `nestjs-pino` integration uses Express middleware for all HTTP
requests, including Better Auth. Nest adds request context with HTTP auto-logging
disabled to avoid duplicates. JSON logs contain `service_name=skull-api` and
`environment=APP_ENV`. `logging.config.ts` validates format, level and the local
file mirror; `logging.ts` owns logger creation and `http-logging.ts` owns HTTP
serialization and context integration. Staging/production require JSON stdout.

`compose.observability.yml` is independent of PostgreSQL and Mailpit.
`pnpm dev:logs` keeps stdout and mirrors API JSON to `output/logs/api.jsonl`.
Alloy reads this directory and persists collection positions in its volume.
Loki persists logs and compactor state with seven-day retention; Grafana
provisions the datasource and dashboard. Only service and environment are indexed;
request IDs stay in JSON.

`compose.logs-collector.yml` defines only Alloy, with separate project/position
volumes per environment. `docker.alloy` discovers containers labelled
`skull.logs=true` and `skull.logs.environment=APP_ENV`. The indexed environment
comes from the collector; service_name comes from application JSON, falling
back to the Compose service. Renaming the API service keeps its dashboard queries.
`LOKI_URL` supplies the destination, with optional `LOKI_TOKEN_FILE` and
`LOKI_TENANT_ID`. The fragment deploys no application or Loki/Grafana backend.
The platform owns Docker socket privileges, access, TLS, retention and backups.
Environment labels filter logs and do not isolate access permissions.
