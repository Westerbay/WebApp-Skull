import { createFormHook } from "@tanstack/react-form"
import { fieldContext, formContext } from "../form-context"
import { AuthSubmitButton } from "../components/auth-submit-button"

export const { useAppForm: useAuthForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {},
  formComponents: { AuthSubmitButton },
})
