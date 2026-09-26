import { useMemo } from "react"
import {
  password_strength_label,
  password_strength_0,
  password_strength_1,
  password_strength_2,
  password_strength_3,
  password_strength_4,
} from "@workspace/i18n/messages"
import { getPasswordStrength } from "../password-strength"

const labels = [
  password_strength_0,
  password_strength_1,
  password_strength_2,
  password_strength_3,
  password_strength_4,
] as const

export function PasswordStrength({
  id,
  password,
}: {
  id: string
  password: string
}) {
  const score = useMemo(() => getPasswordStrength(password), [password])
  const label = labels[score]()
  return (
    <div id={id} className="space-y-1 text-sm text-muted-foreground">
      <div
        role="meter"
        aria-label={password_strength_label()}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
        aria-valuetext={label}
        className="flex gap-1"
      >
        {[0, 1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={
              segment <= score
                ? "h-1.5 flex-1 rounded-full bg-primary"
                : "h-1.5 flex-1 rounded-full bg-muted"
            }
          />
        ))}
      </div>
      <p>
        {password_strength_label()} : {label}
      </p>
    </div>
  )
}
