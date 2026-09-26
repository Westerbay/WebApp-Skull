import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { buildUrlPatterns } from "../packages/i18n/routing-config.mjs"
import {
  documents,
  getDocumentationLocale,
  readJson,
  readLocaleRegistry,
  resolveSourcePath,
} from "./template-registry.mjs"

export async function prepareTemplate(root, { locales, docsLocale }) {
  const registry = await readLocaleRegistry(root)
  locales ??= [registry.sourceLocale]
  if (
    !Array.isArray(locales) ||
    !locales.length ||
    new Set(locales).size !== locales.length
  )
    throw new Error("Choose distinct locales")
  for (const locale of locales)
    if (!Object.hasOwn(registry.locales, locale))
      throw new Error(`Unsupported locale: ${locale}`)
  docsLocale ??= getDocumentationLocale(registry, locales[0])
  if (
    !Object.hasOwn(registry.locales, docsLocale) ||
    !registry.locales[docsLocale].documentation
  )
    throw new Error(`Unsupported documentation locale: ${docsLocale}`)
  const baseRouting = await readJson(
    resolve(root, "packages/i18n/routing.json")
  )
  const baseMessages = await readJson(
    resolveSourcePath(root, registry.locales[registry.sourceLocale].messages)
  )
  const messages = new Map()
  const routes = new Map()
  for (const locale of locales) {
    const pack = registry.locales[locale]
    const catalog = await readJson(resolveSourcePath(root, pack.messages))
    if (
      JSON.stringify(Object.keys(catalog).sort()) !==
      JSON.stringify(Object.keys(baseMessages).sort())
    )
      throw new Error(`Message keys differ for ${locale}`)
    messages.set(locale, catalog)
    const routeCatalog =
      pack.routes === null
        ? Object.fromEntries(
            baseRouting.routes.map((route) => [route.path, route.path])
          )
        : await readJson(resolveSourcePath(root, pack.routes))
    if (
      JSON.stringify(Object.keys(routeCatalog).sort()) !==
      JSON.stringify(baseRouting.routes.map((route) => route.path).sort())
    )
      throw new Error(`Route keys differ for ${locale}`)
    routes.set(locale, routeCatalog)
  }
  const routing = {
    prefixLocales: locales.length > 1,
    routes: baseRouting.routes.map((route) => ({
      path: route.path,
      localized: locales.map((locale) => [
        locale,
        routes.get(locale)[route.path],
      ]),
    })),
  }
  buildUrlPatterns(routing, locales)
  const documentation = new Map()
  const docsRoot = resolveSourcePath(
    root,
    registry.locales[docsLocale].documentation
  )
  for (const document of documents)
    documentation.set(
      document,
      await readFile(resolve(docsRoot, document), "utf8")
    )
  const settings = await readJson(
    resolve(root, "packages/i18n/project.inlang/settings.json")
  )
  const manifest = await readJson(resolve(root, "package.json"))
  for (const name of Object.keys(manifest.scripts))
    if (name.startsWith("template:")) delete manifest.scripts[name]
  return {
    messages,
    routing,
    documentation,
    manifest,
    settings: { ...settings, baseLocale: locales[0], locales },
  }
}
