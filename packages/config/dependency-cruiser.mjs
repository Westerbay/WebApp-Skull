import { resolve } from "node:path"

export default {
  forbidden: [
    {
      name: "unresolved-source-import",
      severity: "error",
      comment:
        "Unresolved imports must not silently bypass boundaries. Vite resolves CSS URL assets.",
      from: { path: "^(apps/[^/]+|packages/[^/]+)/src/" },
      to: { couldNotResolve: true, pathNot: "\\.css\\?url$" },
    },
    {
      name: "web-no-server",
      severity: "error",
      comment:
        "The web consumes public contracts, never server implementations.",
      from: { path: "^apps/web/src/" },
      to: {
        path: "^(apps/api/|packages/(?:database|email|core)/|@workspace/(?:database|email|core)(?:/|$))",
      },
    },
    {
      name: "api-no-web",
      severity: "error",
      from: { path: "^apps/api/src/" },
      to: { path: "^(apps/web/|packages/ui/|@workspace/ui(?:/|$))" },
    },
    {
      name: "packages-no-apps",
      severity: "error",
      comment: "Shared packages cannot depend on application composition.",
      from: { path: "^packages/[^/]+/src/" },
      to: { path: "^apps/" },
    },
    {
      name: "core-independent",
      severity: "error",
      comment: "Core ports have no runtime, framework or adapter dependencies.",
      from: { path: "^packages/core/src/" },
      to: { pathNot: "^packages/core/src/" },
    },
    {
      name: "contracts-independent",
      severity: "error",
      comment: "Public schemas depend only on other contracts and Zod.",
      from: { path: "^packages/contracts/src/" },
      to: { pathNot: "^packages/contracts/src/|(^|/)node_modules/zod/" },
    },
    {
      name: "ui-no-business-dependencies",
      severity: "error",
      comment:
        "UI primitives do not depend on application features or business packages.",
      from: { path: "^packages/ui/src/" },
      to: { path: "^(apps/|packages/(?!ui/)|@workspace/(?!ui(?:/|$)))" },
    },
  ],
  options: {
    doNotFollow: {
      path: "(^|/)(?:node_modules|dist|test|generated|\\.output|\\.tanstack)(?:/|$)",
    },
    tsPreCompilationDeps: true,
    // The resolver needs an explicit baseUrl for aliases in a nested tsconfig.
    tsConfig: { fileName: resolve("scripts/tsconfig.boundaries.json") },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["types", "import", "node", "default"],
    },
  },
}
