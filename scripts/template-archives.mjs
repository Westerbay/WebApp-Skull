import { parseArgs } from "node:util"
import { execFileSync } from "node:child_process"
import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"
import { generateTemplate } from "./template-generator.mjs"

const arguments_ = process.argv.slice(2)
if (arguments_[0] === "--") arguments_.shift()
const { values } = parseArgs({
  args: arguments_,
  options: { output: { type: "string", default: "output/templates" } },
})
const directory = resolve(values.output)
await mkdir(directory, { recursive: true })
for (const locale of ["en", "fr"]) {
  const output = await generateTemplate({
    output: resolve(directory, locale),
    locales: [locale],
    docsLocale: locale,
  })
  execFileSync(
    "tar",
    [
      "-czf",
      resolve(directory, `webapp-skull-${locale}.tar.gz`),
      "-C",
      output,
      ".",
    ],
    { stdio: "inherit" }
  )
}
console.log(`English and French archives are ready in ${directory}`)
