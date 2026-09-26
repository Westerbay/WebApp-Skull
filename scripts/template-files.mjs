import { cp, lstat, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { execFileSync } from "node:child_process"
import { resolveSourcePath } from "./template-registry.mjs"

const excluded = [
  "template/",
  ".agents/",
  ".codex/",
  "scripts/template-",
  "scripts/test/template-",
  ".github/workflows/templates.yml",
  "packages/i18n/messages/",
]

export async function listTemplateFiles(source) {
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      cwd: source,
      encoding: "utf8",
    }
  )
    .split("\0")
    .filter(Boolean)
  const selected = []
  for (const file of files) {
    if (excluded.some((prefix) => file.startsWith(prefix))) continue
    if (
      file
        .split("/")
        .some((part) => part.startsWith(".env") && part !== ".env.example")
    )
      continue
    const path = resolveSourcePath(source, file)
    let entry
    try {
      entry = await lstat(path)
    } catch (error) {
      if (error.code === "ENOENT") continue
      throw error
    }
    if (!entry.isFile()) throw new Error(`Unsupported source entry: ${file}`)
    selected.push(file)
  }
  return selected
}

export async function copyTemplateFiles(source, destination, files) {
  await mkdir(dirname(destination), { recursive: true })
  await mkdir(destination, { recursive: false })
  for (const file of files) {
    const target = resolveSourcePath(destination, file)
    await mkdir(dirname(target), { recursive: true })
    await cp(resolve(source, file), target)
  }
}
