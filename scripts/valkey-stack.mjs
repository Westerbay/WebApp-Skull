import { spawnSync } from "node:child_process"
import { mkdtemp, writeFile, rm, rmdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const action = process.argv[2]
if (!["up", "down"].includes(action))
  throw new Error("Expected Valkey action: up or down")
const directory = await mkdtemp(join(tmpdir(), "skull-valkey-"))
const emptyEnv = join(directory, "empty.env")
try {
  await writeFile(emptyEnv, "")
  const args = [
    "compose",
    "--env-file",
    emptyEnv,
    "-f",
    "compose.valkey.yml",
    action,
  ]
  if (action === "up") args.push("-d", "--wait", "--wait-timeout", "90")
  const result = spawnSync("docker", args, {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    stdio: "inherit",
  })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally {
  await rm(emptyEnv, { force: true })
  await rmdir(directory)
}
