import { format } from "prettier"
import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { sourceRoot } from "./template-registry.mjs"
import { prepareTemplate } from "./template-plan.mjs"
import { copyTemplateFiles, listTemplateFiles } from "./template-files.mjs"

export async function generateTemplate(options, source = sourceRoot) {
  if (!options.output)
    throw new Error("An explicit output directory is required")
  const destination = resolve(options.output)
  if (destination === resolve(source))
    throw new Error("Cannot overwrite the source repository")
  // Validate catalogs, routes and documentation before creating the destination.
  const plan = await prepareTemplate(source, options)
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
