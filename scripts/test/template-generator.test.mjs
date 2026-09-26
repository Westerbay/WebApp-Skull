import { test } from "node:test"
import assert from "node:assert/strict"
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  access,
  writeFile,
  symlink,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { fileURLToPath, pathToFileURL } from "node:url"
import { buildUrlPatterns } from "../../packages/i18n/routing-config.mjs"
import { templateProfiles } from "../template-profiles.mjs"
import { generateTemplate } from "../template-generator.mjs"

const source = fileURLToPath(new URL("../../", import.meta.url))
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"))
const requireI18n = createRequire(
  new URL("../../packages/i18n/package.json", import.meta.url)
)
const { compile } = await import(requireI18n.resolve("@inlang/paraglide-js"))

for (const { id, locales, docsLocale } of templateProfiles) {
  test(`generates the ${id} profile with working translated URLs`, async () => {
    const temporary = await mkdtemp(join(tmpdir(), "skull-template-test-"))
    try {
      const output = join(temporary, "missing", "nested", "project")
      await generateTemplate({ output, profile: id })
      assert.deepEqual(
        (await readdir(join(output, "packages/i18n/messages"))).sort(),
        locales.map((locale) => `${locale}.json`).sort()
      )
      const settings = await readJson(
        join(output, "packages/i18n/project.inlang/settings.json")
      )
      assert.equal(settings.baseLocale, locales[0])
      assert.deepEqual(settings.locales, locales)
      const routing = await readJson(join(output, "packages/i18n/routing.json"))
      assert.equal(routing.prefixLocales, locales.length > 1)
      const signin = routing.routes.find(({ path }) => path === "/sign-in")
      if (locales.includes("fr"))
        assert.ok(
          signin.localized.some(
            ([locale, path]) => locale === "fr" && path === "/connexion"
          )
        )
      const readme = await readFile(join(output, "README.md"), "utf8")
      const docsRoot = docsLocale === "fr" ? "template/locales/fr" : "."
      assert.equal(
        readme,
        await readFile(join(source, docsRoot, "README.md"), "utf8")
      )
      assert.equal(
        await readFile(join(output, ".github/workflows/ci.yml"), "utf8"),
        await readFile(join(source, ".github/workflows/ci.yml"), "utf8")
      )
      for (const excluded of [
        "template",
        ".env",
        ".git",
        "scripts/template-create.mjs",
      ])
        await assert.rejects(access(join(output, excluded)))
      execFileSync(process.execPath, ["scripts/docs-check.mjs"], {
        cwd: output,
      })
      await verifyRouting(output, settings, routing)
      await assert.rejects(generateTemplate({ output, profile: id }), {
        code: "EEXIST",
      })
      assert.equal(await readFile(join(output, "README.md"), "utf8"), readme)
    } finally {
      await rm(temporary, { recursive: true, force: true })
    }
  })
}

test("refuses an unknown profile before creating output", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "skull-template-invalid-"))
  try {
    const output = join(temporary, "project")
    await assert.rejects(
      generateTemplate({ output, profile: "unknown" }),
      /Unknown template profile/
    )
    await assert.rejects(access(output))
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})

test("CLI accepts pnpm's separator and a French profile", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "skull-template-cli-"))
  try {
    const output = join(temporary, "project")
    execFileSync(process.execPath, [
      "scripts/template-create.mjs",
      "--",
      "--profile",
      "fr",
      "--output",
      output,
    ])
    assert.deepEqual(await readdir(join(output, "packages/i18n/messages")), [
      "fr.json",
    ])
    assert.ok(
      (await readFile(join(output, "README.md"), "utf8")).includes(
        "Application web TypeScript"
      )
    )
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})

async function verifyRouting(output, settings, routing) {
  const outdir = join(output, "routing-test-runtime")
  await compile({
    project: join(output, "packages/i18n/project.inlang"),
    outdir,
    strategy: ["url", "baseLocale"],
    urlPatterns: buildUrlPatterns(routing, settings.locales),
  })
  await symlink(
    join(source, "packages/i18n/node_modules"),
    join(outdir, "node_modules"),
    "dir"
  )
  await writeFile(
    join(outdir, "package.json"),
    JSON.stringify({ type: "module" })
  )
  const runtime = await import(pathToFileURL(join(outdir, "runtime.js")).href)
  for (const locale of settings.locales) {
    for (const route of routing.routes) {
      const original = new URL(
        "https://app.example.test" + route.path + "?redirect=%2F#form"
      )
      const publicPath = route.localized.find(
        ([language]) => language === locale
      )[1]
      const expected = routing.prefixLocales
        ? `/${locale}${publicPath === "/" ? "" : publicPath}`
        : publicPath
      const localized = runtime.localizeUrl(original, { locale })
      assert.equal(localized.pathname, expected)
      assert.equal(localized.search, original.search)
      assert.equal(localized.hash, original.hash)
      assert.equal(runtime.deLocalizeUrl(localized).href, original.href)
      assert.equal(runtime.extractLocaleFromUrl(localized), locale)
    }
  }
}
