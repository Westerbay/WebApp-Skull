import { Link } from "@tanstack/react-router"
import projectConfig from "@workspace/config/project" with { type: "json" }
import { Button } from "@workspace/ui/components/button"
import { primary_navigation } from "@workspace/i18n/messages"
import { SessionActions } from "@/features/auth/components/session-actions"

export function AppHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <nav aria-label={primary_navigation()}>
          <Button variant="ghost" asChild>
            <Link to="/">{projectConfig.name}</Link>
          </Button>
        </nav>
        <SessionActions />
      </div>
    </header>
  )
}
