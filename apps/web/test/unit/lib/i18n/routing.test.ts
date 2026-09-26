import { expect, it } from "vitest"
import { setTimeout as delay } from "node:timers/promises"
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@workspace/i18n/config"
import { deLocalizeUrl, localizeUrl, getLocale } from "@workspace/i18n/runtime"
import { paraglideMiddleware } from "@workspace/i18n/server"
import { getLocalizedCallbackUrl } from "@workspace/i18n/routing"

it("round-trips every supported signin URL while preserving search and hash", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const internal = new URL(
      "https://app.example.test/sign-in?redirect=%2F#form"
    )
    const localized = localizeUrl(internal, { locale })
    const roundTrip = deLocalizeUrl(localized)
    expect(roundTrip.pathname).toBe("/sign-in")
    expect(roundTrip.search).toBe(internal.search)
    expect(roundTrip.hash).toBe(internal.hash)
  }
})

it("builds absolute auth callbacks in the default locale", () => {
  const callback = getLocalizedCallbackUrl(
    "/reset-password",
    "https://app.example.test"
  )
  const localized = localizeUrl(
    new URL("https://app.example.test/reset-password"),
    { locale: DEFAULT_LOCALE }
  )
  expect(callback).toBe(localized.href)
})

it("keeps SSR locale isolated across concurrent localized requests", async () => {
  const requests = SUPPORTED_LOCALES.map(async (locale) => {
    const url = localizeUrl(new URL("https://app.example.test/sign-in"), {
      locale,
    })
    return paraglideMiddleware(new Request(url), async () => {
      await delay(10)
      return new Response(getLocale())
    })
  })
  const responses = await Promise.all(requests)
  expect(
    await Promise.all(responses.map((response) => response.text()))
  ).toEqual([...SUPPORTED_LOCALES])
})
