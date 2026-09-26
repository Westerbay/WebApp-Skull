import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { password_show, password_hide } from "@workspace/i18n/messages"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import type { ComponentProps } from "react"

export function PasswordInput(
  props: Omit<ComponentProps<typeof Input>, "type">
) {
  const [visible, setVisible] = useState(false)

  function handleToggleVisibility() {
    setVisible(!visible)
  }

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
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    </div>
  )
}
