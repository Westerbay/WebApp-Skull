import { createServer } from "node:net"
import { expect, it } from "vitest"
import { createSmtpSender } from "../../src/sender.js"
import { getEmailConfig } from "../../src/config.js"
import type { Socket } from "node:net"

it("bounds a suspended local SMTP connection and closes its socket", async () => {
  const sockets = new Set<Socket>()
  const server = createServer((socket) => {
    sockets.add(socket)
    socket.on("close", () => {
      sockets.delete(socket)
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string")
    throw new Error("No test SMTP port")
  const sender = createSmtpSender(
    getEmailConfig({
      APP_ENV: "test",
      EMAIL_MODE: "capture",
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(address.port),
    })
  )
  const started = performance.now()
  try {
    await expect(
      sender.send({
        to: "test@example.test",
        subject: "fixture",
        html: "fixture",
        text: "fixture",
      })
    ).rejects.toThrow("EMAIL_DELIVERY_FAILED")
    expect(performance.now() - started).toBeLessThan(11500)
  } finally {
    for (const socket of sockets) socket.destroy()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}, 15000)
