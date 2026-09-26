import { compile } from "@inlang/paraglide-js"
import { readFile } from "node:fs/promises"

const routing = JSON.parse(
  await readFile(new URL("./routing.json", import.meta.url), "utf8")
)
const settings = JSON.parse(
  await readFile(
    new URL("./project.inlang/settings.json", import.meta.url),
    "utf8"
  )
)
const urlPatterns = routing.routes.map((route) => ({
  pattern: route.path,
  localized: route.localized.map(([locale, path]) => {
    if (routing.prefixLocales) {
      let suffix = path
      if (path === "/") suffix = ""
      return [locale, `/${locale}${suffix}`]
    }
    return [locale, path]
  }),
}))
urlPatterns.push({
  pattern: "/:path(.*)?",
  localized: settings.locales.map((locale) => {
    if (routing.prefixLocales) return [locale, `/${locale}/:path(.*)?`]
    return [locale, "/:path(.*)?"]
  }),
})
await compile({
  project: "./project.inlang",
  outdir: "./src/generated",
  strategy: ["url", "baseLocale"],
  urlPatterns,
  emitTsDeclarations: true,
  watch: process.argv.includes("--watch"),
})
