import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import {
  access,
  chmod,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { delimiter, join, resolve } from "node:path"
import { test } from "node:test"

const root = resolve(import.meta.dirname, "../..")
const launcher = join(root, "scripts/infra/stack.mjs")

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "compose-launcher-test-"))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const capture = join(directory, "capture.json")
  const docker = join(directory, "docker")
  await writeFile(
    docker,
    `#!${process.execPath}
const fs = require("node:fs")
const args = process.argv.slice(2)
const envFile = args[args.indexOf("--env-file") + 1]
fs.writeFileSync(process.env.CAPTURE, JSON.stringify({
  args, cwd: process.cwd(), envContent: fs.readFileSync(envFile, "utf8"),
  port: process.env.VALKEY_PORT
}))
process.exit(Number(process.env.DOCKER_STATUS || 0))
`
  )
  await chmod(docker, 0o755)
  const run = (args, status = 0, overrides = {}) =>
    spawnSync(process.execPath, [launcher, ...args], {
      cwd: directory,
      encoding: "utf8",
      env: {
        PATH: directory + delimiter + process.env.PATH,
        CAPTURE: capture,
        VALKEY_PORT: "16379",
        DOCKER_STATUS: String(status),
        ...overrides,
      },
    })
  return { run, capture, directory }
}

// The executable stub uses a POSIX shebang; it never contacts a Docker daemon.
const options = { skip: process.platform === "win32" }

test(
  "removes the temporary env file when Docker cannot be spawned",
  options,
  async (t) => {
    const { run, directory } = await fixture(t)
    const result = run(["valkey", "up"], 0, { PATH: "", TMPDIR: directory })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /ENOENT/)
    assert.deepEqual(await readdir(directory), ["docker"])
  }
)

test(
  "launches each stack from the repository with isolated env and its own startup policy",
  options,
  async (t) => {
    const { run, capture } = await fixture(t)
    for (const [stack, file, flags] of [
      ["logs", "observability", ["-d"]],
      ["valkey", "valkey", ["-d", "--wait", "--wait-timeout", "90"]],
    ]) {
      const result = run([stack, "up"])
      assert.equal(result.status, 0, result.stderr)
      const recorded = JSON.parse(await readFile(capture, "utf8"))
      const envFile = recorded.args[2]
      assert.deepEqual(recorded.args, [
        "compose",
        "--env-file",
        envFile,
        "-f",
        `infra/compose/${file}.yml`,
        "up",
        ...flags,
      ])
      assert.equal(recorded.cwd, root)
      assert.equal(recorded.envContent, "")
      assert.equal(recorded.port, "16379")
      await assert.rejects(access(envFile), { code: "ENOENT" })
    }
  }
)

test(
  "stops stacks without deleting volumes and propagates Docker failure after cleanup",
  options,
  async (t) => {
    const { run, capture } = await fixture(t)
    for (const stack of ["logs", "valkey"]) {
      const result = run([stack, "down"], 17)
      assert.equal(result.status, 17, result.stderr)
      const { args } = JSON.parse(await readFile(capture, "utf8"))
      assert.deepEqual(args.slice(5), ["down"])
      await assert.rejects(access(args[2]), { code: "ENOENT" })
    }
  }
)

test(
  "rejects unknown stacks, actions and extra arguments before invoking Docker",
  options,
  async (t) => {
    const { run, capture } = await fixture(t)
    for (const args of [
      [],
      ["unknown", "up"],
      ["toString", "up"],
      ["logs", "reset"],
      ["valkey", "down", "--volumes"],
    ]) {
      const result = run(args)
      assert.equal(result.status, 1)
      assert.match(result.stderr, /Usage: stack.mjs/)
      await assert.rejects(access(capture), { code: "ENOENT" })
    }
  }
)
