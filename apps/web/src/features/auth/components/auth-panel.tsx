import { useId } from "react"
import type { ReactNode } from "react"

export function AuthPanel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col justify-center gap-7 px-5 py-12"
    >
      <header className="space-y-3">
        <h1 id={titleId} className="text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  )
}
