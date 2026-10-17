import { useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { network_error, signed_out } from "@workspace/i18n/messages"
import { useMutation } from "@tanstack/react-query"
import { signOutMutationOptions } from "../mutations/auth.mutations"
import { authErrorMessage } from "../auth-error"

export function useSignOut() {
  const router = useRouter()
  const mutation = useMutation(
    signOutMutationOptions(router.options.context.queryClient)
  )
  const [pending, setPending] = useState(false)
  const signOut = async () => {
    if (pending) return
    setPending(true)
    try {
      const result = await mutation.mutateAsync()
      if (result.error) {
        toast.error(authErrorMessage(result.error))
        return
      }
      await router.navigate({ to: "/sign-in" })
      await router.invalidate()
      toast.success(signed_out())
    } catch {
      toast.error(network_error())
    } finally {
      setPending(false)
    }
  }
  return { signOut, pending }
}
