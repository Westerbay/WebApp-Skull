import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import config from "../../packages/config/dependency-cruiser.mjs"
import tsConfig from "../tsconfig.boundaries.json" with { type: "json" }

const cli = fileURLToPath(
  new URL(
    "../../node_modules/dependency-cruiser/bin/dependency-cruiser.mjs",
    import.meta.url
  )
)

async function checkBoundaries(t, files) {
  const directory = await mkdtemp(join(tmpdir(), "template-boundaries-"))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const sources = {
    "package.json": JSON.stringify({ type: "module" }),
    "apps/web/tsconfig.json": JSON.stringify({
      include: ["../../**/*.ts"],
      compilerOptions: {
        paths: {
          "@/*": ["./src/*"],
          "@server/*": ["../api/src/*"],
          "@workspace/database": ["../../packages/database/src/index.ts"],
        },
      },
    }),
    "scripts/tsconfig.boundaries.json": JSON.stringify(tsConfig),
    "boundaries.json": JSON.stringify({
      ...config,
      options: {
        ...config.options,
        tsConfig: {
          fileName: join(directory, "scripts/tsconfig.boundaries.json"),
        },
      },
    }),
    "packages/database/src/index.ts": "export interface User { id: string }\n",
    "packages/contracts/src/identity.ts":
      "export interface Identity { id: string }\n",
    ...files,
  }
  for (const [path, content] of Object.entries(sources)) {
    const target = join(directory, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, content)
  }
  const result = spawnSync(
    process.execPath,
    [
      cli,
      "--config",
      "boundaries.json",
      "--output-type",
      "json",
      "apps",
      "packages",
    ],
    {
      cwd: directory,
      encoding: "utf8",
    }
  )
  if (result.error) throw result.error
  assert.ok(result.stdout, result.stderr)
  const report = JSON.parse(result.stdout)
  assert.ok(report.summary, result.stderr)
  assert.equal(result.status, 0, result.stderr)
  // JSON reports are informational; the CI command uses the error reporter.
  const validation = spawnSync(
    process.execPath,
    [
      cli,
      "--config",
      "boundaries.json",
      "--output-type",
      "err",
      "apps",
      "packages",
    ],
    { cwd: directory, encoding: "utf8" }
  )
  if (validation.error) throw validation.error
  assert.equal(validation.signal, null, validation.stderr)
  assert.equal(
    validation.status === 0,
    report.summary.error === 0,
    validation.stderr
  )
  return report.summary.violations
}

test("rejects server dependencies through relative, dynamic, aliased and type imports", async (t) => {
  const violations = await checkBoundaries(t, {
    "apps/api/src/internal.ts": "export const internal = 1\n",
    "apps/web/src/relative.ts":
      'export { internal } from "../../api/src/internal.js"\n',
    "apps/web/src/dynamic.ts": 'void import("@workspace/database")\n',
    "apps/web/src/type.ts":
      'import type { User } from "@workspace/database"\nexport type Result = User\n',
    "apps/web/src/alias.ts": 'export { internal } from "@server/internal"\n',
  })
  const rejected = violations
    .filter(({ rule }) => rule.name === "web-no-server")
    .map(({ from }) => from)
    .sort()
  assert.deepEqual(rejected, [
    "apps/web/src/alias.ts",
    "apps/web/src/dynamic.ts",
    "apps/web/src/relative.ts",
    "apps/web/src/type.ts",
  ])
})

test("rejects application dependencies in packages and UI business contracts", async (t) => {
  const violations = await checkBoundaries(t, {
    "apps/api/src/internal.ts": "export const internal = 1\n",
    "packages/email/src/index.ts":
      'export { internal } from "../../../apps/api/src/internal.js"\n',
    "packages/ui/src/widget.ts":
      'import type { Identity } from "../../contracts/src/identity.js"\nexport type Widget = Identity\n',
    "apps/web/src/widget.ts": "export const widget = 1\n",
    "apps/api/src/ui.ts": 'export { widget } from "../../web/src/widget.js"\n',
  })
  const names = violations.map(({ rule }) => rule.name)
  assert.ok(names.includes("packages-no-apps"))
  assert.ok(names.includes("ui-no-business-dependencies"))
  assert.ok(names.includes("api-no-web"))
})

test("keeps core and contracts independent of server and framework types", async (t) => {
  const violations = await checkBoundaries(t, {
    "packages/core/src/port.ts":
      'import type { User } from "../../database/src/index.js"\nexport type Port = User\n',
    "packages/contracts/src/runtime.ts":
      'import type { IncomingMessage } from "node:http"\nexport type Request = IncomingMessage\n',
    "node_modules/@nestjs/common/package.json": JSON.stringify({
      name: "@nestjs/common",
      types: "index.d.ts",
    }),
    "node_modules/@nestjs/common/index.d.ts":
      "export interface NestApplication { close(): Promise<void> }\n",
    "packages/core/src/framework.ts":
      'import type { NestApplication } from "@nestjs/common"\nexport type FrameworkPort = NestApplication\n',
  })
  const names = violations.map(({ rule }) => rule.name)
  assert.ok(names.includes("core-independent"))
  assert.ok(names.includes("contracts-independent"))
  assert.ok(
    violations.some(
      ({ from, rule }) =>
        from === "packages/core/src/framework.ts" &&
        rule.name === "core-independent"
    )
  )
})

test("allows web contracts and API persistence adapters", async (t) => {
  const violations = await checkBoundaries(t, {
    "apps/web/src/identity.ts":
      'import type { Identity } from "../../../packages/contracts/src/identity.js"\nexport type CurrentUser = Identity\n',
    "apps/api/src/users.ts":
      'import type { User } from "../../../packages/database/src/index.js"\nexport type Result = User\n',
  })
  assert.deepEqual(violations, [])
})

test("fails when an unresolved alias would hide a dependency from the graph", async (t) => {
  const violations = await checkBoundaries(t, {
    "apps/web/src/missing.ts": 'void import("@/missing-adapter")\n',
  })
  assert.ok(
    violations.some(({ rule }) => rule.name === "unresolved-source-import")
  )
})

test("rejects cross-feature dependencies without listing feature names", async (t) => {
  const violations = await checkBoundaries(t, {
    "apps/web/src/features/catalog/model.ts":
      "export interface Product { id: string }\n",
    "apps/web/src/features/checkout/relative.ts":
      'import type { Product } from "../catalog/model.js"\nexport type Item = Product\n',
    "apps/web/src/features/catalog/dynamic.ts":
      'void import("@/features/checkout/relative")\n',
    "apps/web/src/features/checkout/alias.ts":
      'export type { Product } from "@/features/catalog/model"\n',
  })
  assert.deepEqual(
    violations
      .filter(({ rule }) => rule.name === "web-features-independent")
      .map(({ from }) => from)
      .sort(),
    [
      "apps/web/src/features/catalog/dynamic.ts",
      "apps/web/src/features/checkout/alias.ts",
      "apps/web/src/features/checkout/relative.ts",
    ]
  )
})

test("rejects composition dependencies from shared libraries and features", async (t) => {
  const violations = await checkBoundaries(t, {
    "apps/web/src/routes/page.ts": "export const page = 1\n",
    "apps/web/src/components/shell.ts": "export const shell = 1\n",
    "apps/web/src/features/catalog/model.ts": "export const product = 1\n",
    "apps/web/src/lib/coupled.ts":
      'export { product } from "@/features/catalog/model"\nexport { shell } from "@/components/shell"\n',
    "apps/web/src/features/catalog/coupled.ts":
      'export { page } from "@/routes/page"\nexport { shell } from "@/components/shell"\n',
  })
  assert.equal(
    violations.filter(({ rule }) => rule.name === "web-lib-no-composition")
      .length,
    2
  )
  assert.equal(
    violations.filter(({ rule }) => rule.name === "web-features-no-composition")
      .length,
    2
  )
})

test("allows page composition, feature-local imports and shared mechanisms", async (t) => {
  const violations = await checkBoundaries(t, {
    "apps/web/src/lib/query.ts": "export const query = 1\n",
    "apps/web/src/features/catalog/model.ts":
      "export interface Product { id: string }\n",
    "apps/web/src/features/catalog/view.ts":
      'export type { Product } from "./model.js"\nexport { query } from "@/lib/query"\n',
    "apps/web/src/features/checkout/view.ts": "export const checkout = 1\n",
    "apps/web/src/routes/home.ts":
      'export * from "@/features/catalog/view"\nexport * from "@/features/checkout/view"\n',
    "apps/web/src/components/header.ts":
      'export * from "@/features/catalog/view"\n',
  })
  assert.deepEqual(violations, [])
})
