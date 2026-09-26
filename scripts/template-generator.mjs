import { format } from "prettier"
import { cp, lstat, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve, relative } from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const source = fileURLToPath(new URL("../", import.meta.url))
const availableLocales = ["en", "fr"]
const excluded = [
  "template/",
  ".agents/",
  ".codex/",
  "scripts/template-",
  "scripts/test/template-",
  ".github/workflows/templates.yml",
]

export async function generateTemplate({
  output,
  locales = ["en"],
  docsLocale = locales[0],
}) {
  if (!output) throw new Error("An explicit output directory is required")
  if (!locales.length || new Set(locales).size !== locales.length)
    throw new Error("Choose distinct locales")
  for (const locale of [...locales, docsLocale]) {
    if (!availableLocales.includes(locale))
      throw new Error(`Unsupported locale: ${locale}`)
  }
  const baseMessages = JSON.parse(
    await readFile(resolve(source, "packages/i18n/messages/en.json"), "utf8")
  )
  for (const locale of locales) {
    if (locale === "en") continue
    const messages = JSON.parse(
      await readFile(
        resolve(source, "template/locales", locale, "messages.json"),
        "utf8"
      )
    )
    if (
      JSON.stringify(Object.keys(messages).sort()) !==
      JSON.stringify(Object.keys(baseMessages).sort())
    ) {
      throw new Error(`Message keys differ for ${locale}`)
    }
  }
  const destination = resolve(output)
  if (destination === source.replace(/\/$/, ""))
    throw new Error("Cannot overwrite the source repository")
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: source, encoding: "utf8" }
  )
    .split("\0")
    .filter(Boolean)
  await mkdir(destination, { recursive: false })
  for (const file of files) {
    if (excluded.some((prefix) => file.startsWith(prefix))) continue
    if (
      file
        .split("/")
        .some((part) => part.startsWith(".env") && part !== ".env.example")
    )
      continue
    if (file.startsWith("packages/i18n/messages/")) continue
    const target = resolve(destination, file)
    if (relative(destination, target).startsWith(".."))
      throw new Error("Unsafe source path")
    let entry
    try {
      entry = await lstat(resolve(source, file))
    } catch (error) {
      if (error.code === "ENOENT") continue
      throw error
    }
    if (!entry.isFile()) throw new Error(`Unsupported source entry: ${file}`)
    await mkdir(dirname(target), { recursive: true })
    await cp(resolve(source, file), target)
  }
  await mkdir(resolve(destination, "packages/i18n/messages"), {
    recursive: true,
  })
  for (const locale of locales) {
    let messageSource = resolve(source, "packages/i18n/messages/en.json")
    if (locale !== "en")
      messageSource = resolve(
        source,
        "template/locales",
        locale,
        "messages.json"
      )
    await cp(
      messageSource,
      resolve(destination, "packages/i18n/messages", `${locale}.json`)
    )
  }
  if (docsLocale !== "en") {
    const documents = [
      "README.md",
      "AGENTS.md",
      "docs/CONTEXT.md",
      "docs/PRODUCT.md",
      "docs/ARCHITECTURE.md",
      "docs/DESIGN.md",
      "docs/REUSE.md",
      "docs/DEVELOPMENT.md",
    ]
    for (const document of documents)
      await cp(
        resolve(source, "template/locales", docsLocale, document),
        resolve(destination, document)
      )
  }
  const ciPath = resolve(destination, ".github/workflows/ci.yml")
  const ci = await readFile(ciPath, "utf8")
  await writeFile(ciPath, ci.replace("          pnpm template:check\n", ""))
  const settingsPath = resolve(
    destination,
    "packages/i18n/project.inlang/settings.json"
  )
  const settings = JSON.parse(await readFile(settingsPath, "utf8"))
  settings.baseLocale = locales[0]
  settings.locales = locales
  await writeJson(settingsPath, settings)
  const baseRouting = JSON.parse(
    await readFile(resolve(source, "packages/i18n/routing.json"), "utf8")
  )
  const maps = new Map()
  for (const locale of locales) {
    if (locale === "en")
      maps.set(
        locale,
        Object.fromEntries(
          baseRouting.routes.map((route) => [route.path, route.path])
        )
      )
    else
      maps.set(
        locale,
        JSON.parse(
          await readFile(
            resolve(source, "template/locales", locale, "routes.json"),
            "utf8"
          )
        )
      )
  }
  const routes = baseRouting.routes.map((route) => ({
    path: route.path,
    localized: locales.map((locale) => {
      const path = maps.get(locale)[route.path]
      if (!path) throw new Error(`Missing ${locale} pathname: ${route.path}`)
      return [locale, path]
    }),
  }))
  await writeJson(resolve(destination, "packages/i18n/routing.json"), {
    prefixLocales: locales.length > 1,
    routes,
  })
  const packagePath = resolve(destination, "package.json")
  const manifest = JSON.parse(await readFile(packagePath, "utf8"))
  for (const name of Object.keys(manifest.scripts))
    if (name.startsWith("template:")) delete manifest.scripts[name]
  await writeJson(packagePath, manifest)
  const projectPath = resolve(destination, "packages/config/src/project.json")
  const project = JSON.parse(await readFile(projectPath, "utf8"))
  await writeJson(projectPath, project)
  if (locales[0] === "fr") {
    const fixturePath = resolve(
      destination,
      "apps/api/src/seeds/auth/fixtures.ts"
    )
    const fixtures = await readFile(fixturePath, "utf8")
    await writeFile(fixturePath, fixtures.replaceAll("fakerEN", "fakerFR"))
  }
  return destination
}

async function writeJson(path, value) {
  await writeFile(
    path,
    await format(JSON.stringify(value), {
      filepath: path,
      printWidth: 80,
      trailingComma: "es5",
      endOfLine: "lf",
    })
  )
}
