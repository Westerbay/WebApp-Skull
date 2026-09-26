import { test } from "node:test"
import assert from "node:assert/strict"
import { buildUrlPatterns } from "../../packages/i18n/routing-config.mjs"

function config(routes, prefixLocales = true) {
  return { routes, prefixLocales }
}
function article(path = "/articles/:slug") {
  return {
    path: "/posts/:slug",
    localized: [
      ["en", "/posts/:slug"],
      ["fr", path],
    ],
  }
}

test("localized routes preserve named parameters and prioritize static paths", () => {
  const patterns = buildUrlPatterns(
    config([
      article(),
      {
        path: "/posts/new",
        localized: [
          ["en", "/posts/new"],
          ["fr", "/articles/nouveau"],
        ],
      },
    ]),
    ["en", "fr"]
  )
  assert.equal(patterns[0].pattern, "/posts/new")
  assert.deepEqual(patterns[1].localized, [
    ["en", "/en/posts/:slug"],
    ["fr", "/fr/articles/:slug"],
  ])
  assert.equal(patterns.at(-1).pattern, "/:path(.*)?")
})

test("rejects changed parameters, missing locales, collisions and unsupported patterns", () => {
  assert.throws(
    () => buildUrlPatterns(config([article("/articles/:id")]), ["en", "fr"]),
    /parameters differ/
  )
  assert.throws(
    () => buildUrlPatterns(config([article()]), ["en", "fr", "de"]),
    /coverage differs/
  )
  assert.throws(
    () => buildUrlPatterns(config([article()], false), ["en", "fr"]),
    /require URL prefixes/
  )
  assert.throws(
    () => buildUrlPatterns(config([article("/articles/*")]), ["en", "fr"]),
    /Unsupported route/
  )
  assert.throws(
    () =>
      buildUrlPatterns(
        config([
          article(),
          {
            path: "/news/:id",
            localized: [
              ["en", "/news/:id"],
              ["fr", "/articles/:id"],
            ],
          },
        ]),
        ["en", "fr"]
      ),
    /Duplicate localized route/
  )
  assert.throws(
    () =>
      buildUrlPatterns(
        config([
          article(),
          {
            path: "/posts/:id",
            localized: [
              ["en", "/news/:id"],
              ["fr", "/actualites/:id"],
            ],
          },
        ]),
        ["en", "fr"]
      ),
    /Duplicate internal route/
  )
})
