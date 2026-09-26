# Context

## Current state

The application supports signup, email verification, explicit signin, password
reset and signout. Password visibility and a local strength meter are available.
Better Auth owns `/api/auth/*`; NestJS protects `/api/me` and `/api/users`.
PostgreSQL stores auth data and Better Auth rate limits. Nest controllers have
separate in-memory quotas; health probes are exempt.

The source repository uses English code, documentation, interface messages and
internal routes. French documentation, messages and public pathnames live in
`template/locales/fr`. Generated projects contain only the selected message
catalogs and one documentation language. Single-language projects have no locale
prefix; multilingual projects prefix every public route with its locale.
Paraglide localizes URLs at the router boundary and isolates SSR locale state.

Local email is captured by Mailpit. Guarded migrations and seeds refuse remote
or unverified databases. Two reference accounts and 60 deterministic Faker
profiles demonstrate cursor pagination over four dashboard pages. Logs are
sanitized; PostgreSQL readiness is bounded and resources close on shutdown.
CI checks quality, secrets, real integration and mobile E2E in owned environments.

The connected dashboard demonstrates TanStack Table pagination. Contracts,
server page construction and the `useInfiniteQuery` wrapper are reusable.
Configuration stays with its owner; table orchestration and rendering are split.
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
after a crash. CI does not exercise real staging SMTP. Nest rate limits are not
shared between replicas. Dynamic content slugs require future domain data keyed
by stable content IDs; static pathname localization does not translate content.
A normal Git clone downloads the source language packs; generated archives
contain only the requested languages and no repository history.

The standalone Docker collector integration uses explicit environment/opt-in
labels and a configurable Loki endpoint, optional token file and tenant. Its
flow is verified with owned local containers; staging/production are not deployed.
