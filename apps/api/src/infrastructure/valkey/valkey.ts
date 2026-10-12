import { Redis } from "ioredis"
import { valkeyTimeoutMs } from "./valkey.config.js"

export interface ValkeyConnection {
  client: Redis
  ready: () => Promise<void>
  close: () => Promise<void>
  observe: () => Promise<ValkeyObservation>
}

export interface ValkeyObservation {
  connectedClients: number
  usedMemoryBytes: number
  maxMemoryBytes: number
  evictedKeys: number
  rejectedConnections: number
}

function infoNumber(info: string, key: string) {
  const value = info
    .split(/\r?\n/)
    .find((line) => line.startsWith(key + ":"))
    ?.slice(key.length + 1)
  const parsed = Number(value)
  if (value === undefined || !Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Invalid Valkey observation")
  }
  return parsed
}

export function createValkey(
  url: string,
  reportUnavailable: () => void
): ValkeyConnection {
  const client = new Redis(url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: valkeyTimeoutMs,
    commandTimeout: valkeyTimeoutMs,
    maxRetriesPerRequest: 0,
  })
  client.on("error", reportUnavailable)
  const ready = async () => {
    await client.ping()
  }
  const close = () => {
    client.disconnect()
    return Promise.resolve()
  }
  const observe = async (): Promise<ValkeyObservation> => {
    const info = await client.info()
    return {
      connectedClients: infoNumber(info, "connected_clients"),
      usedMemoryBytes: infoNumber(info, "used_memory"),
      maxMemoryBytes: infoNumber(info, "maxmemory"),
      evictedKeys: infoNumber(info, "evicted_keys"),
      rejectedConnections: infoNumber(info, "rejected_connections"),
    }
  }
  return { client, ready, close, observe }
}
