import { test } from "node:test"
import assert from "node:assert/strict"
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  access,
  cp,
  writeFile,
  symlink,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"
import { buildUrlPatterns } from "../../packages/i18n/routing-config.mjs"
import {
  getTemplateProfiles,
  getDocumentationLocale,
  readLocaleRegistry,
  sourceRoot,
} from "../template-registry.mjs"
import { generateTemplate } from "../template-generator.mjs"

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"))

const registry = await readLocaleRegistry()
const localeSelections = getTemplateProfiles(registry).map((profile) =>
  profile.locales.split(",")
)
if (Object.keys(registry.locales).length > 1)
  localeSelections.push(Object.keys(registry.locales).reverse())

for (const locales of localeSelections) {
  test(`generates only selected catalogs: ${locales.join(",")}`, async () => {
    const temporary = await mkdtemp(join(tmpdir(), "skull-template-test-"))
    try {
      const output = join(temporary, "missing", "nested", "project")
      await generateTemplate({ output, locales })
      assert.deepEqual(
        (await readdir(join(output, "packages/i18n/messages"))).sort(),
        locales.map((locale) => `${locale}.json`).sort()
      )
      assert.equal(
        await readFile(join(output, ".github/workflows/ci.yml"), "utf8"),
        await readFile(join(sourceRoot, ".github/workflows/ci.yml"), "utf8")
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
      const docsLocale = getDocumentationLocale(registry, locales[0])
      assert.equal(
        readme,
        await readFile(
          join(
            sourceRoot,
            registry.locales[docsLocale].documentation,
            "README.md"
          ),
          "utf8"
        )
      )
      await verifyRouting(output, settings, routing)
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
    generateTemplate({
      output: "output/not-created",
      locales: ["not-registered"],
    }),
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

const requireI18n = createRequire(
  new URL("../../packages/i18n/package.json", import.meta.url)
)
const { compile } = await import(requireI18n.resolve("@inlang/paraglide-js"))

async function verifyRouting(output, settings, routing) {
  const withArticle = {
    ...routing,
    routes: [
      ...routing.routes,
      {
        path: "/posts/:slug",
        localized: settings.locales.map((locale) => [
          locale,
          `/${locale}-articles/:slug`,
        ]),
      },
      {
        path: "/posts/new",
        localized: settings.locales.map((locale) => [
          locale,
          `/` + locale + `-articles/new`,
        ]),
      },
    ],
  }
  const outdir = join(output, "routing-test-runtime")
  await compile({
    project: join(output, "packages/i18n/project.inlang"),
    outdir,
    strategy: ["url", "baseLocale"],
    urlPatterns: buildUrlPatterns(withArticle, settings.locales),
  })
  await symlink(
    join(sourceRoot, "packages/i18n/node_modules"),
    join(outdir, "node_modules"),
    "dir"
  )
  await writeFile(
    join(outdir, "package.json"),
    JSON.stringify({ type: "module" })
  )
  const runtime = await import(pathToFileURL(join(outdir, "runtime.js")).href)
  for (const locale of settings.locales) {
    for (const route of withArticle.routes) {
      const original = new URL(
        "https://app.example.test" +
          route.path.replace(":slug", "caf%C3%A9") +
          "?page=2#details"
      )
      const translatedPath = route.localized
        .find(([language]) => language === locale)[1]
        .replace(":slug", "caf%C3%A9")
      const expectedPath = routing.prefixLocales
        ? `/${locale}${translatedPath === "/" ? "" : translatedPath}`
        : translatedPath
      const localized = runtime.localizeUrl(original, { locale })
      assert.equal(localized.pathname, expectedPath)
      assert.equal(localized.search, original.search)
      assert.equal(localized.hash, original.hash)
      assert.equal(runtime.deLocalizeUrl(localized).href, original.href)
      assert.equal(runtime.extractLocaleFromUrl(localized), locale)
    }
  }
}

test("a third locale needs only registry data and catalogs; documentation falls back to the source", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "skull-template-extension-"))
  try {
    const source = await generateTemplate({ output: join(temporary, "source") })
    await cp(join(sourceRoot, "template"), join(source, "template"), {
      recursive: true,
    })
    execFileSync("git", ["init", "--quiet"], { cwd: source })
    const registryPath = join(source, "template/locales.json")
    const registry = await readJson(registryPath)
    const extraPack = join(source, "template/locales/qaa")
    await mkdir(extraPack)
    await cp(
      join(source, "packages/i18n/messages/en.json"),
      join(extraPack, "messages.json")
    )
    await cp(
      join(source, "template/locales/fr/routes.json"),
      join(extraPack, "routes.json")
    )
    registry.locales.qaa = {
      messages: "template/locales/qaa/messages.json",
      routes: "template/locales/qaa/routes.json",
    }
    await writeFile(registryPath, JSON.stringify(registry))
    const profiles = getTemplateProfiles(await readLocaleRegistry(source))
    assert.ok(
      profiles.some(
        (profile) => profile.id === "qaa" && profile.docsLocale === "en"
      )
    )
    assert.ok(
      profiles.some(
        (profile) => profile.locales === Object.keys(registry.locales).join(",")
      )
    )
    const output = await generateTemplate(
      { output: join(temporary, "extra-locale"), locales: ["qaa", "fr"] },
      source
    )
    const settings = await readJson(
      join(output, "packages/i18n/project.inlang/settings.json")
    )
    assert.equal(settings.baseLocale, "qaa")
    assert.deepEqual(settings.locales, ["qaa", "fr"])
    assert.ok(
      (await readFile(join(output, "README.md"), "utf8")).includes(
        "A reusable TypeScript"
      )
    )
    await verifyRouting(
      output,
      settings,
      await readJson(join(output, "packages/i18n/routing.json"))
    )

    const routesPath = join(extraPack, "routes.json")
    const invalidOutput = join(temporary, "invalid")
    await assert.rejects(
      generateTemplate(
        { output: invalidOutput, locales: ["qaa"], docsLocale: "qaa" },
        source
      ),
      /Unsupported documentation locale/
    )
    await assert.rejects(access(invalidOutput))
    const messagesPath = join(extraPack, "messages.json")
    const messages = await readJson(messagesPath)
    const incomplete = { ...messages }
    delete incomplete.sign_in
    await writeFile(messagesPath, JSON.stringify(incomplete))
    await assert.rejects(
      generateTemplate({ output: invalidOutput, locales: ["qaa"] }, source),
      /Message keys differ/
    )
    await assert.rejects(access(invalidOutput))
    await writeFile(messagesPath, JSON.stringify(messages))
    const routes = await readJson(routesPath)
    delete routes["/sign-in"]
    await writeFile(routesPath, JSON.stringify(routes))
    await assert.rejects(
      generateTemplate({ output: invalidOutput, locales: ["qaa"] }, source),
      /Route keys differ/
    )
    await assert.rejects(access(invalidOutput))
    routes["/sign-in"] = "/"
    await writeFile(routesPath, JSON.stringify(routes))
    await assert.rejects(
      generateTemplate({ output: invalidOutput, locales: ["qaa"] }, source),
      /Duplicate localized route/
    )
    await assert.rejects(access(invalidOutput))
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})
