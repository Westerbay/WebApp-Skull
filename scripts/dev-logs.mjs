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

const handleInterrupt = () => child.kill("SIGINT")
const handleTermination = () => child.kill("SIGTERM")
process.on("SIGINT", handleInterrupt)
process.on("SIGTERM", handleTermination)
const handleError = (error) => {
  console.error(error.message)
  process.exitCode = 1
}
const handleExit = (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0)
}

child.on("error", handleError)
child.on("exit", handleExit)
