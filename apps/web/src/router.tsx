import { deLocalizeUrl, localizeUrl } from "@workspace/i18n/runtime"
import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"

import { createQueryClient } from "./lib/query/query-client"
import { routeTree } from "./routeTree.gen"

function rewriteIncomingUrl({ url }: { url: URL }) {
  return deLocalizeUrl(url)
}

function rewriteOutgoingUrl({ url }: { url: URL }) {
  return localizeUrl(url)
}

export function getRouter() {
  const queryClient = createQueryClient()
  const router = createTanStackRouter({
    routeTree,
    rewrite: {
      input: rewriteIncomingUrl,
      output: rewriteOutgoingUrl,
    },
    context: { queryClient },

    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  })

  setupRouterSsrQueryIntegration({
    queryClient,
    router,
  })

  return router
}

export type RouterContext = {
  queryClient: ReturnType<typeof createQueryClient>
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
