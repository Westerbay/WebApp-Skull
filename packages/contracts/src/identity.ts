import { z } from "zod"

export const currentUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
}) satisfies z.ZodType<CurrentUser>

export interface CurrentUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
}
