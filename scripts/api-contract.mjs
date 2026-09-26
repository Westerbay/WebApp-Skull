import { spawnSync } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const mode = process.argv[2]
const root = resolve(import.meta.dirname, "..")
const committedSpec = join(root, "apps/api/openapi.json")
const committedTypes = join(root, "apps/web/src/lib/api/schema.d.ts")

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status ?? 1}`)
  }
}

async function generate(specPath, typesPath) {
  run("pnpm", ["--filter", "@workspace/api", "build"])
  run("node", ["apps/api/dist/openapi/generate.js", specPath])
  run("pnpm", [
    "--filter",
    "web",
    "exec",
    "openapi-typescript",
    specPath,
    "-o",
    typesPath,
  ])
  run("pnpm", [
    "exec",
    "prettier",
    "--config",
    join(root, ".prettierrc"),
    "--write",
    specPath,
    typesPath,
  ])
}

if (mode === "generate") {
  await generate(committedSpec, committedTypes)
} else if (mode === "check") {
  const directory = await mkdtemp(join(tmpdir(), "webapp-skull-api-"))
  const generatedSpec = join(directory, "openapi.json")
  const generatedTypes = join(directory, "schema.d.ts")

  try {
    await generate(generatedSpec, generatedTypes)
    const files = [
      [committedSpec, generatedSpec],
      [committedTypes, generatedTypes],
    ]

    for (const [committed, generated] of files) {
      const [committedContent, generatedContent] = await Promise.all([
        readFile(committed, "utf8"),
        readFile(generated, "utf8"),
      ])

      if (committedContent !== generatedContent) {
        console.error(`API contract drift detected in ${committed}`)
        process.exitCode = 1
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
} else {
  console.error("Usage: api-contract.mjs <generate|check>")
  process.exitCode = 1
}
