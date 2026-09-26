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

## Languages

Active catalogs live in `packages/i18n/messages`; supported languages and the
default are configured in `packages/i18n/project.inlang/settings.json`.
Public paths are configured in `packages/i18n/routing.json`. Single-language
projects omit locale prefixes; multilingual projects prefix every language.
Code identifiers and internal routes stay English.

<!-- template-maintainers:start -->

Maintaining the source template? See the [distribution guide](template/README.md)
for profile generation, archive validation and versioned releases.
This tooling and its documentation are excluded from generated applications.

<!-- template-maintainers:end -->

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
