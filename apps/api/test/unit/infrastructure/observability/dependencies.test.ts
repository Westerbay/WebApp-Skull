import { afterEach, expect, it, vi } from "vitest"
import { createApiMetrics } from "../../../../src/infrastructure/observability/metrics.js"

const postgresObservation = {
  connections: 2,
  activeConnections: 1,
  lockWaitingConnections: 0,
  serverConnections: 5,
  maxConnections: 100,
}

afterEach(() => vi.useRealTimers())

it("removes stale resource samples after failure and leaves disabled Valkey distinct", async () => {
  const postgres = vi
    .fn()
    .mockResolvedValueOnce(postgresObservation)
    .mockRejectedValueOnce(new Error("private-provider-details"))
  const metrics = createApiMetrics("test", "test", { postgres })
  try {
    const healthy = await metrics.collect()
    expect(healthy).toMatch(
      /skull_dependency_up\{[^\n]*dependency="postgres"[^\n]*\} 1/
    )
    expect(healthy).toMatch(
      /skull_dependency_enabled\{[^\n]*dependency="valkey"[^\n]*\} 0/
    )
    expect(healthy).not.toMatch(
      /skull_dependency_up\{[^\n]*dependency="valkey"/
    )
    expect(healthy).toMatch(/skull_postgres_connections\{/)
    const failed = await metrics.collect()
    expect(failed).toMatch(
      /skull_dependency_up\{[^\n]*dependency="postgres"[^\n]*\} 0/
    )
    expect(failed).not.toMatch(/skull_postgres_connections\{/)
    expect(failed).not.toContain("private-provider-details")
  } finally {
    metrics.close()
  }
})

it("bounds stalled dependency scrapes and shares outstanding operations across scrapes", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
  let resolveObservation:
    | ((value: typeof postgresObservation) => void)
    | undefined
  const postgres = vi.fn(
    () =>
      new Promise<typeof postgresObservation>((resolve) => {
        resolveObservation = resolve
      })
  )
  const metrics = createApiMetrics("test", "test", { postgres })
  try {
    const first = metrics.collect()
    const simultaneous = metrics.collect()
    await vi.advanceTimersByTimeAsync(2100)
    expect(await first).toEqual(await simultaneous)
    const retry = metrics.collect()
    await vi.advanceTimersByTimeAsync(2100)
    expect(await retry).toMatch(/skull_dependency_up\{[^\n]*\} 0/)
    expect(postgres).toHaveBeenCalledOnce()
    resolveObservation?.(postgresObservation)
    await Promise.resolve()
    const recovered = metrics.collect()
    await Promise.resolve()
    resolveObservation?.(postgresObservation)
    expect(await recovered).toMatch(/skull_dependency_up\{[^\n]*\} 1/)
  } finally {
    metrics.close()
  }
})
