# WebApp Skull

A reusable TypeScript web application with email/password authentication,
cursor pagination and guarded local development tools.

## Stack

Node.js 24, pnpm 12, Turborepo, NestJS 11/Express, TanStack Start/Router/Query/Form,
Tailwind/shadcn, Better Auth, Zod, OpenAPI/openapi-typescript/openapi-fetch,
Drizzle/PostgreSQL 17, Vitest, React Email/Nodemailer, Mailpit, Paraglide,
Sonner, Playwright, Docker Compose, Pino, GitHub Actions and Gitleaks.

## Start

Requires Node.js 24, pnpm 12 and Docker.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm run setup
pnpm dev
```

Web: `http://localhost:3000`; API: `http://localhost:3001`; Swagger: `/docs` on the
API; health: `/health/live`; Mailpit: `http://localhost:8025`; PostgreSQL: port 5433.
Setup starts infrastructure and applies guarded migrations without seeding.

## Language profiles

This source repository uses English code and documentation. Its default product
is English-only. French resources are optional source packs. To create a project
from the maintainer repository without copying unused languages:

```bash
pnpm template:create -- --locales en --output output/my-english-app
pnpm template:create -- --locales fr --docs-locale fr --output output/mon-app
pnpm template:create -- --locales en,fr --docs-locale en --output output/multilingual-app
pnpm template:archives
```

The output directory must not already exist. Generated projects keep English
code identifiers, selected catalogs and one documentation language. French-only
URLs use `/connexion`; multilingual URLs use `/en/sign-in` and `/fr/connexion`.
`output/templates/webapp-skull-en.tar.gz` and `webapp-skull-fr.tar.gz` contain
only the selected language, with no Git history, dependencies or real `.env`.
A normal clone downloads the maintainer's source packs; use an archive to avoid
that download. Distribution archives are built by the template workflow.

## Commands

```bash
pnpm check                    # formatting, lint, types, unit tests, contracts, docs, builds
pnpm test:integration         # real auth/API with owned ephemeral services
pnpm test:e2e                 # mobile auth and pagination journey
pnpm docs:check
pnpm project:check
pnpm api:generate
pnpm api:check
pnpm db:generate
pnpm db:migrate
pnpm db:seed -- --scenario auth
pnpm db:seed -- --scenario auth --clean
pnpm db:seed -- --all
pnpm db:studio
pnpm dev:infra
pnpm dev:down
```

Seeding is explicit, requires fixture mode and restores two reference accounts
plus 60 deterministic demo profiles. Local email is captured by Mailpit.

## Structure

```text
apps/api             NestJS API and server integrations
apps/web             TanStack Start application
packages/contracts   shared schemas and interfaces
packages/core        business rules and pure ports when required
packages/database    Drizzle schemas, migrations and client
packages/email       server email templates and transport
packages/i18n        selected catalogs and generated Paraglide runtime
packages/ui          shared primitives and styles
docs                 current project documentation
template             optional source language packs (maintainer repository only)
```

Better Auth owns `/api/auth`; Nest OpenAPI is consumed by the typed web client.
Both clients use session cookies. Read [docs/CONTEXT.md](docs/CONTEXT.md) and
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) before changing the project.

## License

WebApp-Skull uses the [MIT license](LICENSE). When reusing this project, please
mention it and link to [its repository](https://github.com/Westerbay/WebApp-Skull).
Attribution is optional and is not an extra license condition.

## Local observability

Start the optional Alloy/Loki/Grafana stack with `pnpm logs:up`, then feed API
JSON logs with `pnpm dev:logs`. Open [Grafana](http://localhost:3002).
`pnpm logs:test` verifies the complete flow in isolated containers without a
database or an environment file. See [DEVELOPMENT.md](docs/DEVELOPMENT.md).
