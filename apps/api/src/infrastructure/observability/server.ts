import { createServer } from "node:http"
import { once } from "node:events"
import type { Server } from "node:http"
import type { ApiMetrics } from "./metrics.js"

export interface MetricsServer {
  server: Server
  close: () => Promise<void>
}

export async function startMetricsServer(
  metrics: ApiMetrics,
  address: { host: string; port: number }
): Promise<MetricsServer> {
  const server = createServer((request, response) => {
    if (request.url !== "/metrics") {
      response.writeHead(404).end()
      return
    }
    if (request.method !== "GET") {
      response.writeHead(405, { Allow: "GET" }).end()
      return
    }
    const sendMetrics = async () => {
      try {
        const body = await metrics.collect()
        response
          .writeHead(200, {
            "Content-Type": metrics.registry.contentType,
            "Cache-Control": "no-store",
          })
          .end(body)
      } catch {
        // A failed scrape remains visible to Prometheus; no provider details leak.
        response.writeHead(503).end("Metrics collection failed\n")
      }
    }
    void sendMetrics()
  })
  server.requestTimeout = 5000
  server.headersTimeout = 5000
  server.listen(address.port, address.host)
  await once(server, "listening")
  const close = () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
      server.closeIdleConnections()
    })
  return { server, close }
}
