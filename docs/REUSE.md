# Reuse

## Shared contracts and identity

`apps/web/src/features/auth/auth-error.ts` translates provider errors, including
compromised passwords and reset-specific recovery instructions.

- `packages/config/src/project.json`: product name and description; technical
  settings stay with their owner.
- `packages/contracts/src/common.ts`: HTTP error envelope.
- `packages/contracts/src/identity.ts`: public current-user shape.
- `packages/contracts/src/auth.constraints.ts`: password bounds and token
  lifetimes shared by validation, Better Auth and email rendering.

## Web and interface

- `packages/ui/src/components`: reusable Button, Card, Field, Input, Spinner,
  Tabs and Sonner primitives; shared tokens/styles in `src/styles/globals.css`.
- `apps/web/src/lib/auth/auth-client.ts`: Better Auth client.
- `apps/web/src/lib/auth/current-user.ts`: identity query, fresh protected-route
  verification and private cache purge on authentication transitions.
- `apps/web/src/lib/query/query-client.ts` and `query.config.ts`: query defaults.
- `apps/web/src/lib/query/query-keys.ts`: `privateQueryKeyPrefix`; build private
  keys with feature and parameters. Public queries survive identity changes.
- `apps/web/src/lib/api/client.ts`, `config.ts`, `http-status.ts`: typed HTTP
  client with cookies, public API URL and named HTTP statuses.
- `apps/web/src/lib/auth/redirect.ts`: restrictive internal redirect validation.
- `apps/web/src/lib/seo/private-head.ts`: auth/private noindex metadata.
- `apps/web/src/features/auth`: schemas and inferred form types, named action
  hooks, AuthPanel and AuthInput. Unique IDs associate labels/help/errors.
  PasswordInput owns visibility; PasswordStrength is shared by signup/reset.

## Localization

- `packages/i18n/src/config.ts`: default/supported locales from generated runtime.
- `packages/i18n/src/routing.ts`: localized paths and external callback URLs.
- `packages/i18n/routing.json`: internal-to-public pathname mappings.
- `packages/i18n/routing-config.mjs`: shared route validation and URL pattern
  construction for runtime compilation.
- `packages/i18n/compile.mjs`: URL-based runtime compilation and declarations.
- `packages/i18n/messages/<locale>.json`: active UI and email catalogs.
- `apps/api/src/infrastructure/auth/email-locale.ts`: supported callback locale
  constrained to the configured web origin, with base-locale fallback.

## Server and email

- `apps/api/src/infrastructure/auth/guard.ts`: global protection, Public and
  CurrentUser decorators. `auth.config.ts` owns session and rate-limit settings.
- `apps/api/src/infrastructure/http/http-error.filter.ts`: Nest error envelope;
  do not apply it to Better Auth routes.
- `apps/api/src/infrastructure/rate-limit`: decorators and global/per-route
  quotas, socket-based peer normalization and health exemptions.
- `packages/database/src/client.ts`, `config.ts`, `target.ts`: Drizzle lifecycle,
  pool settings and guarded CLI database targets.
- `apps/api/src/modules/health/readiness.ts`: injectable probe and timeout.
- `apps/api/src/infrastructure/logging/logging.ts`: sanitized Pino HTTP logging.
- `apps/api/src/seeds/seed.ts`, `registry.ts`: pure scenario contract, preparation
  before mutation, selection validation and ordering.
- `apps/api/src/seeds/auth`: pure scenario/fixtures, local configuration and
  transactional adapter with reserved-signature collision checks.
- `apps/api/test/support/auth.harness.ts`: owned DB, Mailpit and HTTP helpers for
  integration/E2E only.
- `apps/api/src/openapi/config.ts`: documentation path and API version.
- `packages/core/src/email.ts`: technology-independent EmailSender port.
- `packages/email`: explicit-locale HTML/text rendering and guarded SMTP/capture.
- `apps/api/src/infrastructure/email/auth-email-dispatcher.ts`: tracked sends,
  sanitized events and bounded drainage.

## Pagination

- `packages/contracts/src/pagination.constraints.ts`: cursor/limit bounds and
  shared default page size.
- `packages/contracts/src/pagination.ts`: bounded query schema, cursorPageSchema
  factory and CursorPage type `{ items, nextCursor }`.
- `apps/api/src/infrastructure/pagination/cursor-page.ts`: build from `limit + 1`
  rows; use the last visible ID and the same unique order in the DB query.
- `apps/web/src/lib/query/use-cursor-infinite-query.ts`: query hook/options factory;
  include filters/page size in keys and forward abort signals. Cursor parameters
  are automatic; native QueryObserverOptions, previous-page cursor, maxPages and
  subscribed remain available.

List only capabilities with real multiple consumers and document their owner.

## Observability

- `apps/api/src/infrastructure/logging/logging.config.ts`: validated logging
  settings; JSON stdout required outside development.
- `apps/api/src/infrastructure/logging/logging.ts`: Pino logger and output
  destinations. `http-logging.ts` owns sanitized serializers, HTTP middleware
  and Nest request context.
- `infra/observability`: file/Docker collection, Loki storage and Grafana
  provisioning. Index only stable labels, never request or user identifiers.
- `scripts/test-logs.mjs`: real HTTP ingestion and Grafana assertions;
  `scripts/support/logs-test-harness.mjs` owns isolated containers, cleanup
  and polling configuration.

- `compose.logs-collector.yml`: standalone Docker collector integration for an external Loki endpoint, without application/backend deployment.
- `scripts/test-docker-logs.mjs`: local verification of Docker opt-in, environment selection and stable service labels.

## Optional infrastructure integrations

- `compose.valkey.yml`: independent, ephemeral local Valkey service.
- `apps/api/src/infrastructure/valkey`: validated opt-in configuration and client lifecycle.
- `apps/api/src/infrastructure/rate-limit/valkey-rate-limit-store.ts`: atomic shared Nest quotas.
- `apps/api/test/valkey`: owned-container verification; run `pnpm valkey:test`.

Keep integrations opt-in with explicit configuration, separate infrastructure
and focused tests. Add cache consumers only for an actual application need.
