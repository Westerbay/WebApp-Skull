import { format } from "prettier"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { buildUrlPatterns } from "../packages/i18n/routing-config.mjs"
import { templateProfiles } from "./template-profiles.mjs"
import { copyTemplateFiles, listTemplateFiles } from "./template-files.mjs"

const source = fileURLToPath(new URL("../", import.meta.url))
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

export async function generateTemplate({ output, profile = "en" }) {
  if (!output) throw new Error("An explicit output directory is required")
  const selected = templateProfiles.find(({ id }) => id === profile)
  if (!selected) throw new Error(`Unknown template profile: ${profile}`)
  const destination = resolve(output)
  if (destination === resolve(source))
    throw new Error("Cannot overwrite the source repository")
  // Check catalogs and documentation before creating the destination.
  const plan = await prepareTemplate(selected)
  const files = await listTemplateFiles(source)
  await copyTemplateFiles(source, destination, files)
  await mkdir(resolve(destination, "packages/i18n/messages"), {
    recursive: true,
  })
  for (const [locale, messages] of plan.messages)
    await writeJson(
      resolve(destination, "packages/i18n/messages", `${locale}.json`),
      messages
    )
  for (const [path, content] of plan.documentation)
    await writeFile(resolve(destination, path), content)
  await writeJson(
    resolve(destination, "packages/i18n/project.inlang/settings.json"),
    plan.settings
  )
  await writeJson(
    resolve(destination, "packages/i18n/routing.json"),
    plan.routing
  )
  await writeJson(resolve(destination, "package.json"), plan.manifest)
  return destination
}

async function prepareTemplate({ locales, docsLocale }) {
  const baseRouting = await readJson("packages/i18n/routing.json")
  const baseMessages = await readJson("packages/i18n/messages/en.json")
  const messages = new Map([["en", baseMessages]])
  const routes = new Map([
    [
      "en",
      Object.fromEntries(baseRouting.routes.map(({ path }) => [path, path])),
    ],
  ])
  if (locales.includes("fr")) {
    const frenchMessages = await readJson("template/locales/fr/messages.json")
    const frenchRoutes = await readJson("template/locales/fr/routes.json")
    if (!sameKeys(baseMessages, frenchMessages))
      throw new Error("French message keys differ from English")
    if (!sameKeys(routes.get("en"), frenchRoutes))
      throw new Error("French route keys differ from English")
    messages.set("fr", frenchMessages)
    routes.set("fr", frenchRoutes)
  }
  const routing = {
    prefixLocales: locales.length > 1,
    routes: baseRouting.routes.map(({ path }) => ({
      path,
      localized: locales.map((locale) => [locale, routes.get(locale)[path]]),
    })),
  }
  buildUrlPatterns(routing, locales)
  const documentation = new Map()
  const docsRoot = docsLocale === "fr" ? "template/locales/fr" : "."
  for (const document of documents)
    documentation.set(
      document,
      await readFile(resolve(source, docsRoot, document), "utf8")
    )
  const settings = await readJson("packages/i18n/project.inlang/settings.json")
  const manifest = await readJson("package.json")
  for (const name of Object.keys(manifest.scripts))
    if (name.startsWith("template:")) delete manifest.scripts[name]
  return {
    messages: new Map(locales.map((locale) => [locale, messages.get(locale)])),
    documentation,
    routing,
    manifest,
    settings: { ...settings, baseLocale: locales[0], locales },
  }
}

function sameKeys(left, right) {
  return (
    JSON.stringify(Object.keys(left).sort()) ===
    JSON.stringify(Object.keys(right).sort())
  )
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(source, path), "utf8"))
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
