import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile, readdir, rm, access } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execFileSync } from "node:child_process"
import { generateTemplate } from "../template-generator.mjs"

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"))

for (const locales of [["en"], ["fr"], ["en", "fr"]]) {
  test(`generates only selected catalogs: ${locales.join(",")}`, async () => {
    const temporary = await mkdtemp(join(tmpdir(), "skull-template-test-"))
    try {
      const output = join(temporary, "missing", "nested", "project")
      await generateTemplate({ output, locales, docsLocale: locales[0] })
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
      const signin = routing.routes.find((route) => route.path === "/sign-in")
      if (locales.includes("fr"))
        assert.ok(
          signin.localized.some(
            ([locale, path]) => locale === "fr" && path === "/connexion"
          )
        )
      assert.ok(
        (
          await readFile(
            join(output, "apps/web/src/routes/sign-in.tsx"),
            "utf8"
          )
        ).includes('createFileRoute("/sign-in")')
      )
      const readme = await readFile(join(output, "README.md"), "utf8")
      if (locales[0] === "fr")
        assert.ok(readme.includes("Application web TypeScript"))
      else assert.ok(readme.includes("A reusable TypeScript"))
      await assert.rejects(access(join(output, "template")))
      await assert.rejects(access(join(output, ".env")))
      await assert.rejects(access(join(output, ".git")))
      execFileSync(process.execPath, ["scripts/docs-check.mjs"], {
        cwd: output,
      })
      await assert.rejects(generateTemplate({ output, locales }), {
        code: "EEXIST",
      })
      assert.equal(await readFile(join(output, "README.md"), "utf8"), readme)
    } finally {
      await rm(temporary, { recursive: true, force: true })
    }
  })
}

test("refuses unsupported and duplicate locales before creating output", async () => {
  await assert.rejects(
    generateTemplate({ output: "output/not-created", locales: ["de"] }),
    /Unsupported locale/
  )
  await assert.rejects(
    generateTemplate({ output: "output/not-created", locales: ["en", "en"] }),
    /distinct locales/
  )
})

test("CLI accepts pnpm's separator and independent documentation language", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "skull-template-cli-"))
  try {
    const output = join(temporary, "missing", "nested", "project")
    execFileSync(process.execPath, [
      "scripts/template-create.mjs",
      "--",
      "--locales",
      "en",
      "--docs-locale",
      "fr",
      "--output",
      output,
    ])
    assert.deepEqual(await readdir(join(output, "packages/i18n/messages")), [
      "en.json",
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
