import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router"
import projectConfig from "@workspace/config/project" with { type: "json" }
import { Toaster } from "@workspace/ui/components/sonner"
import { ThemeProvider } from "next-themes"
import { skip_content, project_description } from "@workspace/i18n/messages"
import { getLocale } from "@workspace/i18n/runtime"
import { AppHeader } from "@/components/app-header"
import { NotFound } from "@/components/not-found"
import { PageError } from "@/components/page-error"
import type { RouterContext } from "@/router"
import appCss from "@workspace/ui/globals.css?url"

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: projectConfig.name },
      { name: "description", content: project_description() },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  notFoundComponent: NotFound,
  errorComponent: PageError,
  component: RootLayout,
  shellComponent: RootDocument,
})
function RootLayout() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        {skip_content()}
      </a>
      <AppHeader />
      <main id="main-content">
        <Outlet />
      </main>
    </>
  )
}
function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
