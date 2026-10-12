import { Counter, Gauge } from "@prometheus-io/client"
import { dependencyObservationTimeoutMs } from "./observability.config.js"
import type { Registry } from "@prometheus-io/client"
import type { DatabaseObservation } from "@workspace/database"
import type { ValkeyObservation } from "../valkey/valkey.js"

export interface DependencyObservers {
  postgres: () => Promise<DatabaseObservation>
  valkey?: () => Promise<ValkeyObservation>
}

// Keep one outstanding provider operation per dependency, even after timeout.
function boundedObserver<T>(observe: () => Promise<T>) {
  let pending: Promise<T> | undefined
  return async () => {
    if (!pending) {
      pending = observe().finally(() => {
        pending = undefined
      })
    }
    let timer: NodeJS.Timeout | undefined
    try {
      return await Promise.race([
        pending,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error("Dependency observation timed out")),
            dependencyObservationTimeoutMs
          )
        }),
      ])
    } finally {
      clearTimeout(timer)
    }
  }
}

export function registerDependencyMetrics(
  registry: Registry,
  observers: DependencyObservers
) {
  const up = new Gauge({
    name: "skull_dependency_up",
    help: "Whether the most recent dependency observation succeeded.",
    labelNames: ["dependency"],
    registers: [registry],
  })
  const latency = new Gauge({
    name: "skull_dependency_observation_duration_seconds",
    help: "Duration of the latest dependency observation, including connection acquisition.",
    labelNames: ["dependency"],
    registers: [registry],
  })
  const enabled = new Gauge({
    name: "skull_dependency_enabled",
    help: "Whether this API instance uses a dependency.",
    labelNames: ["dependency"],
    registers: [registry],
  })
  enabled.set({ dependency: "postgres" }, 1)
  enabled.set({ dependency: "valkey" }, Number(Boolean(observers.valkey)))
  const postgresConnections = new Gauge({
    name: "skull_postgres_connections",
    help: "PostgreSQL connections scoped to the application's database and role; not the JS pool queue.",
    labelNames: ["state"],
    registers: [registry],
  })
  const postgresCapacity = new Gauge({
    name: "skull_postgres_server_connections",
    help: "Server-wide connection usage and configured capacity.",
    labelNames: ["kind"],
    registers: [registry],
  })
  const valkeyMemory = new Gauge({
    name: "skull_valkey_memory_bytes",
    help: "Valkey memory use and configured maximum; maximum zero means unlimited.",
    labelNames: ["kind"],
    registers: [registry],
  })
  const valkeyClients = new Gauge({
    name: "skull_valkey_connected_clients",
    help: "Currently connected Valkey clients.",
    registers: [registry],
  })
  valkeyClients.remove()
  const valkeyEvents = new Counter({
    name: "skull_valkey_server_events_total",
    help: "Server-reported cumulative evictions and rejected connections; resets on Valkey restart.",
    labelNames: ["event"],
    registers: [registry],
  })
  const observePostgres = boundedObserver(observers.postgres)
  const collectPostgres = async () => {
    const started = performance.now()
    try {
      const data = await observePostgres()
      postgresConnections.set({ state: "total" }, data.connections)
      postgresConnections.set({ state: "active" }, data.activeConnections)
      postgresConnections.set(
        { state: "lock_waiting" },
        data.lockWaitingConnections
      )
      postgresCapacity.set({ kind: "used" }, data.serverConnections)
      postgresCapacity.set({ kind: "max" }, data.maxConnections)
      up.set({ dependency: "postgres" }, 1)
    } catch {
      up.set({ dependency: "postgres" }, 0)
      postgresConnections.reset()
      postgresCapacity.reset()
    } finally {
      latency.set(
        { dependency: "postgres" },
        (performance.now() - started) / 1000
      )
    }
  }
  let collectValkey = () => Promise.resolve()
  if (observers.valkey) {
    const observeValkey = boundedObserver(observers.valkey)
    collectValkey = async () => {
      const started = performance.now()
      try {
        const data = await observeValkey()
        valkeyMemory.set({ kind: "used" }, data.usedMemoryBytes)
        valkeyMemory.set({ kind: "max" }, data.maxMemoryBytes)
        valkeyClients.set(data.connectedClients)
        valkeyEvents.reset()
        valkeyEvents.inc({ event: "evicted_keys" }, data.evictedKeys)
        valkeyEvents.inc(
          { event: "rejected_connections" },
          data.rejectedConnections
        )
        up.set({ dependency: "valkey" }, 1)
      } catch {
        up.set({ dependency: "valkey" }, 0)
        valkeyMemory.reset()
        valkeyClients.remove()
        valkeyEvents.reset()
      } finally {
        latency.set(
          { dependency: "valkey" },
          (performance.now() - started) / 1000
        )
      }
    }
  }
  return async () => {
    await Promise.all([collectPostgres(), collectValkey()])
  }
}
