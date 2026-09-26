import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { password_show, password_hide } from "@workspace/i18n/messages"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import type { AuthTextInputProps } from "./auth-input.types"

export function PasswordInput(props: AuthTextInputProps) {
  const [visible, setVisible] = useState(false)

  const handleToggleVisibility = () => {
    setVisible(!visible)
  }

  let visibilityIcon = <Eye aria-hidden="true" />
  if (visible) visibilityIcon = <EyeOff aria-hidden="true" />

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("min-h-11 pr-12", props.className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-0 right-0 size-11"
        aria-label={visible ? password_hide() : password_show()}
        aria-controls={props.id}
        aria-pressed={visible}
        onClick={handleToggleVisibility}
      >
        {visibilityIcon}
      </Button>
    </div>
  )
}
