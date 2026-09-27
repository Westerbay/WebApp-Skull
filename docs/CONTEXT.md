#Local Git worktrees can be created and safely removed with interactive commands
in the ignored `.worktree/` directory at the main repository root.

Context

## Current state

Have I Been Pwned rejects compromised new passwords in staging/production.
Development/test remain offline; provider errors block password writes.

The application supports signup, email verification, explicit signin, password
reset and signout. Password visibility and a local strength meter are available.
Better Auth owns `/api/auth/*`; NestJS protects `/api/me` and `/api/users`.
PostgreSQL stores auth data and Better Auth rate limits. Nest controllers have
in-memory quotas by default, or shared quotas through optional Valkey; health probes are exempt.

The active catalogs in `packages/i18n/messages` provide interface and email
translations. `packages/i18n/project.inlang/settings.json` defines the supported
locales and default language; `routing.json` defines public paths.
Single-language projects have no locale prefix; multilingual projects prefix
every public route with its locale. Internal routes and code identifiers stay
English. Paraglide localizes URLs at the router boundary and isolates SSR locale
state.

Local email is captured by Mailpit. Guarded migrations and seeds refuse remote
or unverified databases. Two reference accounts and 60 deterministic Faker
profiles demonstrate cursor pagination over four dashboard pages. Logs are
sanitized; PostgreSQL readiness is bounded and resources close on shutdown.
CI checks quality, secrets, real integration and mobile E2E in owned environments.

The connected dashboard demonstrates TanStack Table pagination and server-side
name/email search with a 300 ms debounce. Authentication forms share native
TanStack Form contexts; specialized Query/Router lint rules guard future changes.
Contracts, server page construction and the `useInfiniteQuery` wrapper are reusable.
Configuration stays with its owner; table orchestration and rendering are split.
Validated contracts and form values derive their types from Zod schemas.
The business domain beyond this example remains undefined.

The project uses the [MIT license](../LICENSE), copyright Mathis Dubuisson.
Attribution when reusing the template is encouraged but optional.

The optional Alloy → Loki → Grafana stack collects API JSON logs with stable
service/environment labels and seven-day retention. Its Compose and volumes
are independent of the application database. An isolated test verifies real
HTTP logs through Grafana. Docker collection for staging/production is prepared;
those deployments remain undefined.

## Documentation map

- [PRODUCT.md](PRODUCT.md): user capabilities and rules.
- [ARCHITECTURE.md](ARCHITECTURE.md): boundaries and flows.
- [DESIGN.md](DESIGN.md): interface conventions.
- [REUSE.md](REUSE.md): shared capabilities.
- [DEVELOPMENT.md](DEVELOPMENT.md): commands and local workflows.

## Current limitations

Email tracking is process-local, without a durable queue or delivery guarantee
after a crash. CI does not exercise real staging SMTP. Without Valkey, Nest rate limits are not
shared between replicas. Localization covers interface/email messages and page
pathnames; no translated-content domain is included.

The standalone Docker collector integration uses explicit environment/opt-in
labels and a configurable Loki endpoint, optional token file and tenant. Its
flow is verified with owned local containers; staging/production are not deployed.

## Optional integrations

Observability and Valkey are opt-in integrations with separate Compose files.
Valkey shares Nest quotas through atomic rolling-window operations; no application
data or auth sessions are cached. Enabled Valkey is required at startup and for
readiness; quota checks return 503 on failure without an in-memory fallback.
