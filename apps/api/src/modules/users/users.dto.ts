import { cursorPaginationSchema } from "@workspace/contracts/pagination"
import { usersPageSchema } from "@workspace/contracts/users"
import { createZodDto } from "nestjs-zod"

export class UsersQueryDto extends createZodDto(cursorPaginationSchema) {}
export class UsersPageDto extends createZodDto(usersPageSchema) {}
