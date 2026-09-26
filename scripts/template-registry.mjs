import { readFile } from "node:fs/promises"
import { isAbsolute, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const sourceRoot = fileURLToPath(new URL("../", import.meta.url))
export const documents = [
  "README.md",
  "AGENTS.md",
  "docs/CONTEXT.md",
  "docs/PRODUCT.md",
  "docs/ARCHITECTURE.md",
  "docs/DESIGN.md",
  "docs/REUSE.md",
  "docs/DEVELOPMENT.md",
]

export function resolveSourcePath(root, path) {
  if (typeof path !== "string" || isAbsolute(path))
    throw new Error("Expected a relative source path")
  const target = resolve(root, path)
  const inside = relative(root, target)
  if (
    inside === ".." ||
    inside.startsWith("../") ||
    inside.startsWith("..\\") ||
    path
      .split(/[\\/]/)
      .some((part) => part.startsWith(".env") && part !== ".env.example")
  )
    throw new Error(`Unsafe source path: ${path}`)
  return target
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"))
}

export async function readLocaleRegistry(root = sourceRoot) {
  const registry = await readJson(resolve(root, "template/locales.json"))
  if (
    !registry.locales ||
    typeof registry.locales !== "object" ||
    Array.isArray(registry.locales) ||
    !Object.hasOwn(registry.locales, registry.sourceLocale)
  )
    throw new Error("Invalid locale registry")
  for (const [locale, pack] of Object.entries(registry.locales)) {
    if (
      !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale) ||
      Intl.getCanonicalLocales(locale)[0] !== locale
    )
      throw new Error(`Invalid locale identifier: ${locale}`)
    resolveSourcePath(root, pack.messages)
    if (pack.routes !== null) resolveSourcePath(root, pack.routes)
    else if (locale !== registry.sourceLocale)
      throw new Error(`Missing route catalog for ${locale}`)
    if (pack.documentation !== undefined)
      resolveSourcePath(root, pack.documentation)
  }
  if (!registry.locales[registry.sourceLocale].documentation)
    throw new Error("The source locale must provide documentation")
  return registry
}

export function getDocumentationLocale(registry, locale) {
  return registry.locales[locale].documentation ? locale : registry.sourceLocale
}

export function getTemplateProfiles(registry) {
  const locales = Object.keys(registry.locales)
  const profiles = locales.map((locale) => ({
    id: locale,
    locales: locale,
    docsLocale: getDocumentationLocale(registry, locale),
  }))
  if (locales.length > 1)
    profiles.push({
      id: "multilingual",
      locales: locales.join(","),
      docsLocale: registry.sourceLocale,
    })
  return profiles
}
