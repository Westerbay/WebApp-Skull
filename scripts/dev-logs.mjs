import { spawn } from "node:child_process"
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const directory = fileURLToPath(new URL("../output/logs/", import.meta.url))
await mkdir(directory, { recursive: true })

const child = spawn("pnpm", ["dev"], {
  stdio: "inherit",
  env: {
    ...process.env,
    LOG_FORMAT: "json",
    LOG_FILE: fileURLToPath(
      new URL("../output/logs/api.jsonl", import.meta.url)
    ),
  },
})

const forwardSignal = (signal) => child.kill(signal)
process.on("SIGINT", forwardSignal)
process.on("SIGTERM", forwardSignal)
child.on("error", (error) => {
  console.error(error.message)
  process.exitCode = 1
})
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0)
})
