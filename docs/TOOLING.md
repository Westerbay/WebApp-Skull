# Repository tooling

Use the commands in the root `package.json` as the supported entry points.
Scripts are development tools; application behavior belongs to `apps` and
`packages`.

## Configuration placement

`compose.yml` stays at the root so plain `docker compose` and the development
commands discover PostgreSQL and Mailpit. Specialized, independent stacks live
in `infra/compose/`: `test.yml`, `valkey.yml`, `observability.yml` and
`logs-collector.yml`. Their bind mounts resolve relative to that directory;
test overrides use absolute paths. Test suites assign unique project names;
optional stacks declare their own names independently of the file location.

`pnpm-workspace.yaml` and `pnpm-lock.yaml` stay at the workspace root for pnpm.
GitHub workflows stay in `.github/workflows/` for GitHub discovery. Service
configuration stays with its service under `infra/observability/`.

## Script ownership

| Owner                                                 | Purpose and entry points                                                                                                                                                                                                                      |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/infra/`                                      | Local setup, optional stack lifecycle, log-enabled development, auth integration/E2E and observability verification. `support/` owns the isolated observability test resources.                                                               |
| `scripts/infra/stack.mjs`                             | Shared launcher for `logs:up/down` and `valkey:up/down`; each stack declares its Compose file and startup flags. It uses an empty temporary env file, preserves explicit environment overrides and removes the temporary file on failure too. |
| `scripts/api-contract.mjs`                            | Generate OpenAPI and web types together, or reject drift without live dependencies.                                                                                                                                                           |
| `scripts/docs-check.mjs`, `scripts/project-check.mjs` | Check documentation links and repository invariants; `project:check` also runs dependency boundary and tooling regression tests.                                                                                                              |
| `scripts/worktree.mjs`                                | Guarded local worktree creation/removal; its tests use temporary repositories.                                                                                                                                                                |
| `scripts/test/`                                       | Node regression tests for tooling and dependency rules.                                                                                                                                                                                       |

The scripts cover distinct workflows. Keep separate lifecycle entry points and
verification suites: stopping development services must not behave like cleanup
of disposable test resources. Integration, E2E and observability tests own random
project names and clean only their own resources. The deployed log collector is
an integration fragment, not a deployment command.

## JavaScript and shell

Keep `.mjs` for structured files, generated artifacts, subprocess orchestration,
resource cleanup and Node tests. Node is already required by this workspace;
these workflows do not need a second scripting runtime or a transpilation step.
Use Bash for short shell-specific CI steps on the declared Linux runners, such
as verifying a downloaded archive or publishing release assets. Do not rewrite
working scripts solely to change their extension.

## Validation

`pnpm tooling:test` exercises stack argument validation, startup flags, failure
propagation and temporary-env cleanup without starting Docker. Its executable
stub requires POSIX and is skipped on Windows. Real Docker validation uses
`pnpm logs:check`,
`pnpm logs:test`, `pnpm logs:test:docker` and `pnpm test:integration`; those suites
require a verified local Docker daemon. See [DEVELOPMENT.md](DEVELOPMENT.md).
