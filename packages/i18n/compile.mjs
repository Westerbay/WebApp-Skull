import { compile } from "@inlang/paraglide-js"
import { readFile } from "node:fs/promises"
import { buildUrlPatterns } from "./routing-config.mjs"

const routing = JSON.parse(
  await readFile(new URL("./routing.json", import.meta.url), "utf8")
)
const settings = JSON.parse(
  await readFile(
    new URL("./project.inlang/settings.json", import.meta.url),
    "utf8"
  )
)
const urlPatterns = buildUrlPatterns(routing, settings.locales)
await compile({
  project: "./project.inlang",
  outdir: "./src/generated",
  strategy: ["url", "baseLocale"],
  urlPatterns,
  emitTsDeclarations: true,
  watch: process.argv.includes("--watch"),
})
