import { test } from "node:test"
import assert from "node:assert/strict"
import { buildUrlPatterns } from "../../packages/i18n/routing-config.mjs"

const signin = {
  path: "/sign-in",
  localized: [
    ["en", "/sign-in"],
    ["fr", "/connexion"],
  ],
}

test("rejects missing locales and missing multilingual prefixes", () => {
  assert.throws(
    () =>
      buildUrlPatterns({ prefixLocales: true, routes: [signin] }, [
        "en",
        "fr",
        "de",
      ]),
    /coverage differs/
  )
  assert.throws(
    () =>
      buildUrlPatterns({ prefixLocales: false, routes: [signin] }, [
        "en",
        "fr",
      ]),
    /require URL prefixes/
  )
})

test("rejects duplicate public routes and non-path values", () => {
  const duplicate = {
    path: "/sign-up",
    localized: [
      ["en", "/sign-up"],
      ["fr", "/connexion"],
    ],
  }
  assert.throws(
    () =>
      buildUrlPatterns({ prefixLocales: true, routes: [signin, duplicate] }, [
        "en",
        "fr",
      ]),
    /Duplicate route for fr/
  )
  const invalid = {
    path: "/sign-in",
    localized: [["en", "https://example.test"]],
  }
  assert.throws(
    () => buildUrlPatterns({ prefixLocales: false, routes: [invalid] }, ["en"]),
    /Invalid route/
  )
})
