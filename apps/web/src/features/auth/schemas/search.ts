import { z } from "zod"
import { authSearchConstraints } from "./search.constraints"
import { getSafeInternalRedirect } from "@/lib/auth/redirect"

export const signInSearchSchema = z.object({
  redirect: z
    .string()
    .optional()
    .catch(undefined)
    .transform(getSafeInternalRedirect),
})
export const tokenSearchSchema = z.object({
  token: z
    .string()
    .max(authSearchConstraints.tokenMaxLength)
    .optional()
    .catch(undefined),
  error: z.string().optional().catch(undefined),
})
