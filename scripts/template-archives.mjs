import { parseArgs } from "node:util"
import { execFileSync } from "node:child_process"
import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"
import { generateTemplate } from "./template-generator.mjs"
import { templateProfiles } from "./template-profiles.mjs"

const arguments_ = process.argv.slice(2)
if (arguments_[0] === "--") arguments_.shift()
const { values } = parseArgs({
  args: arguments_,
  options: { output: { type: "string", default: "output/templates" } },
})
const directory = resolve(values.output)
await mkdir(directory, { recursive: true })
for (const profile of templateProfiles) {
  const output = await generateTemplate({
    output: resolve(directory, profile.id),
    profile: profile.id,
  })
  execFileSync(
    "tar",
    [
      "-czf",
      resolve(directory, `webapp-skull-${profile.id}.tar.gz`),
      "-C",
      output,
      ".",
    ],
    { stdio: "inherit" }
  )
}
console.log(`Template archives are ready in ${directory}`)
