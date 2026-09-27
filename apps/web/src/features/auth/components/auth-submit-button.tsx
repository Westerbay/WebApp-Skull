import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { useFormContext } from "../form-context"

interface AuthSubmitButtonProps {
  label: string
}

export function AuthSubmitButton({ label }: AuthSubmitButtonProps) {
  const form = useFormContext()
  const selectPending = (state: { isSubmitting: boolean }) => state.isSubmitting
  const renderButton = (pending: boolean) => (
    <Button type="submit" disabled={pending} className="min-h-11">
      {pending && <Spinner />}
      {label}
    </Button>
  )
  return (
    <form.Subscribe selector={selectPending}>{renderButton}</form.Subscribe>
  )
}
