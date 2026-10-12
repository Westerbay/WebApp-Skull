# Context

WebApp-Skull is a reusable full-stack starting point. It includes a working
identity flow, a sample searchable user table and optional local infrastructure;
it does not prescribe the next project's business domain.

The web app uses TanStack Start, Query, Form and Table. NestJS composes the API,
Better Auth owns identity, and PostgreSQL persists data. Shared Zod contracts,
Paraglide localization and UI primitives have separate packages. See
[ARCHITECTURE.md](ARCHITECTURE.md) for boundaries and [REUSE.md](REUSE.md) for
shared extension points.

The template supports signup, email verification, signin, password reset and
signout. The dashboard demonstrates cursor pagination and search. Development
email is captured locally. Optional Valkey shares Nest rate limits across
replicas; an optional Alloy/Loki/Grafana stack collects API logs. Neither is
required for the base application.

## Documentation map

- [PRODUCT.md](PRODUCT.md): capabilities and durable rules.
- [ARCHITECTURE.md](ARCHITECTURE.md): boundaries and flows.
- [DESIGN.md](DESIGN.md): interface conventions.
- [REUSE.md](REUSE.md): reusable extension points.
- [DEVELOPMENT.md](DEVELOPMENT.md): setup, commands and procedures.

## Current limitations

The business domain beyond the sample remains undefined. Email dispatch has no
durable queue or delivery guarantee after a crash. Nest quotas are process-local
without Valkey. Localization covers interface and email copy and public page
paths, not translated content records. Staging and production deployment of the
optional log collector is not supplied or exercised against a real backend.

The project uses the [MIT license](../LICENSE), copyright Mathis Dubuisson.
Attribution when reusing the template is encouraged but optional.
