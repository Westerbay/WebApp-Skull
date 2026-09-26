import { parseArgs } from "node:util"
import { generateTemplate } from "./template-generator.mjs"

const arguments_ = process.argv.slice(2)
if (arguments_[0] === "--") arguments_.shift()

const { values } = parseArgs({
  args: arguments_,
  options: {
    output: { type: "string" },
    locales: { type: "string" },
    "docs-locale": { type: "string" },
  },
})
const output = await generateTemplate({
  output: values.output,
  locales: values.locales?.split(","),
  docsLocale: values["docs-locale"],
})
console.log(`Template generated at ${output}`)
