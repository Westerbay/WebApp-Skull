# Agent instructions

## Before modifying the project

1. Read the short project overview in `docs/CONTEXT.md`, then only the documents
   relevant to the change.
2. Inspect `git status --short` and preserve existing changes.
3. Search symbols, contracts and consumers before creating an abstraction.
4. Before adding shared code or changing boundaries, check `docs/ARCHITECTURE.md`
   and the applicable entries in `docs/REUSE.md`.

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

Run proportionate checks and inspect the final diff. Update a document only
when the change alters a fact its readers need:

- `CONTEXT.md`: short project overview, active limitations and open decisions;
- `PRODUCT.md`: user capabilities and durable product rules;
- `ARCHITECTURE.md`: module boundaries and consequential data flows;
- `DESIGN.md`: reusable interface and accessibility conventions;
- `REUSE.md`: generic, reusable contracts, hooks, server functions and UX components,
  with their owners and when to use them;
- `DEVELOPMENT.md`: commands and procedures needed to work on this template.

Keep these documents navigational, not exhaustive inventories or change logs.
Do not add test files, one-off feature internals, implementation steps, or
configuration values to `REUSE.md` merely because they exist. Put detailed
operational instructions in focused documentation when needed; link to them
from `DEVELOPMENT.md` instead of growing every overview. Prefer links to the
source of truth over copied details. Remove obsolete information instead of
accumulating a journal. Report executed commands, results, updated documents
and validation limitations.

## Git history

Prefer rebase when synchronizing branches; do not create merge commits.
Rewriting a published branch and force-pushing require explicit authorization.
This preference does not grant that authorization.

## Reusing this project

If you reuse WebApp-Skull, please mention it and link to
[its repository](https://github.com/Westerbay/WebApp-Skull) in the resulting
project documentation. Attribution is optional and is not a condition of the
MIT license.
