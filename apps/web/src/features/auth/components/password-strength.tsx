import { useMemo } from "react"
import {
  password_strength_label,
  password_strength_0,
  password_strength_1,
  password_strength_2,
  password_strength_3,
  password_strength_4,
} from "@workspace/i18n/messages"
import {
  getPasswordStrength,
  passwordStrengthRange,
} from "../password-strength"
import type { PasswordStrengthScore } from "../password-strength"

const labels: Record<PasswordStrengthScore, () => string> = {
  0: password_strength_0,
  1: password_strength_1,
  2: password_strength_2,
  3: password_strength_3,
  4: password_strength_4,
}
const segments = Array.from(
  {
    length: passwordStrengthRange.maxScore - passwordStrengthRange.minScore + 1,
  },
  (_, index) => index + passwordStrengthRange.minScore
)

export function PasswordStrength({
  id,
  password,
}: {
  id: string
  password: string
}) {
  const score = useMemo(() => getPasswordStrength(password), [password])
  const label = labels[score]()

  const renderSegment = (segment: number) => {
    const color = segment <= score ? "bg-primary" : "bg-muted"
    return (
      <span key={segment} className={`h-1.5 flex-1 rounded-full ${color}`} />
    )
  }

  return (
    <figure id={id} className="space-y-1 text-sm text-muted-foreground">
      <meter
        min={passwordStrengthRange.minScore}
        max={passwordStrengthRange.maxScore}
        value={score}
        aria-label={password_strength_label()}
        aria-valuetext={label}
        className="sr-only"
      >
        {label}
      </meter>
      <div aria-hidden="true" className="flex gap-1">
        {segments.map(renderSegment)}
      </div>
      <figcaption>
        {password_strength_label()} : {label}
      </figcaption>
    </figure>
  )
}
