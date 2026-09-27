export type ShutdownResource = Readonly<{
  close: () => Promise<unknown>
  name: "server" | "email" | "database" | "valkey"
}>

export type ShutdownEvent = Readonly<{
  event: "api.stopping" | "api.stopped" | "api.shutdown_failed"
  resource?: ShutdownResource["name"]
}>

export function createShutdown(
  resources: ReadonlyArray<ShutdownResource>,
  report: (event: ShutdownEvent) => void
): () => Promise<void> {
  let operation: Promise<void> | undefined

  return () => {
    operation ??= (async () => {
      report({ event: "api.stopping" })
      let failed = false
      for (const resource of resources) {
        try {
          await resource.close()
        } catch {
          failed = true
          report({ event: "api.shutdown_failed", resource: resource.name })
        }
      }
      if (failed) throw new Error("API_SHUTDOWN_FAILED")
      report({ event: "api.stopped" })
    })()
    return operation
  }
}
