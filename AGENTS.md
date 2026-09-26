# Agent instructions

## Before modifying the project

1. Read `docs/CONTEXT.md`, then the documents relevant to the change.
2. Inspect `git status --short` and preserve existing changes.
3. Search symbols, contracts and consumers before creating an abstraction.
4. Check `docs/ARCHITECTURE.md` and existing capabilities in `docs/REUSE.md`.

## Boundaries

- `apps/api` composes NestJS, Better Auth and server adapters.
- `apps/web` must not import server modules.
- `packages/contracts` owns framework-independent shared schemas.
- `packages/core` stays independent of NestJS, React, Drizzle and Better Auth.
- `packages/database` owns Drizzle schemas and migrations.
- `packages/ui` contains reusable UI primitives only.

Do not add layers, repositories or ports without a concrete need. Validate
external inputs at their boundary. Never read, modify or commit a real `.env`
file. Never migrate, reset or seed a remote or unverified database.

## Completing a change

Run proportionate checks and inspect the final diff. Update every document
whose facts changed in the same change:

- `CONTEXT.md`: current state and open decisions;
- `PRODUCT.md`: user capabilities and rules;
- `ARCHITECTURE.md`: boundaries and flows;
- `DESIGN.md`: interface conventions;
- `REUSE.md`: shared capabilities;
- `DEVELOPMENT.md`: commands and procedures.

Remove obsolete information instead of accumulating a journal. Report executed
commands, results, updated documents and validation limitations.

## Git history

Prefer rebase when synchronizing branches; do not create merge commits.
Rewriting a published branch and force-pushing require explicit authorization.
This preference does not grant that authorization.

## Reusing this project

If you reuse WebApp-Skull, please mention it and link to
[its repository](https://github.com/Westerbay/WebApp-Skull) in the resulting
project documentation. Attribution is optional and is not a condition of the
MIT license.
