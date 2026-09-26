import {
  getTemplateProfiles,
  readLocaleRegistry,
} from "./template-registry.mjs"

console.log(
  JSON.stringify({ include: getTemplateProfiles(await readLocaleRegistry()) })
)
