import { z } from "zod";
import type { Role } from "@/lib/api/types";
import { AUTH_MESSAGES } from "./auth";

// Espelha `CreateStaffDto` e `ChangeRoleDto` em docs/api-reference.md
// ("Validações de formulário": `name` 2–100, `email` com formato e até 200,
// normalizado; `password` 8–128; `role` de staff `SUPPORT` ou `ADMIN`).

/** Papéis na ordem de exibição (Cliente → Atendente → Administrador). */
export const ROLE_ORDER = ["CUSTOMER", "SUPPORT", "ADMIN"] as const satisfies readonly Role[];

/** Papéis que o cadastro de equipe aceita. */
export const STAFF_ROLES = ["SUPPORT", "ADMIN"] as const satisfies readonly Role[];

/**
 * Mensagens do cadastro de equipe e da mudança de papel. O administrador
 * preenche os dados de outra pessoa, então os campos vazios não usam "seu".
 */
export const USER_MESSAGES = {
  nameRequired: "Informe o nome.",
  nameLength: AUTH_MESSAGES.nameLength,
  emailRequired: "Informe o e-mail.",
  emailInvalid: AUTH_MESSAGES.emailInvalid,
  emailTooLong: AUTH_MESSAGES.emailTooLong,
  emailTaken: AUTH_MESSAGES.emailTaken,
  passwordRequired: "Defina uma senha.",
  passwordLength: AUTH_MESSAGES.passwordLength,
  roleRequired: "Selecione o papel.",
  newRoleRequired: "Selecione o novo papel.",
} as const;

/** Cadastro de atendente ou administrador (`POST /users/staff`). */
export const createStaffSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, USER_MESSAGES.nameRequired)
    .min(2, USER_MESSAGES.nameLength)
    .max(100, USER_MESSAGES.nameLength),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, USER_MESSAGES.emailRequired)
    .max(200, USER_MESSAGES.emailTooLong)
    .pipe(z.email(USER_MESSAGES.emailInvalid)),
  password: z
    .string()
    .min(1, USER_MESSAGES.passwordRequired)
    .min(8, USER_MESSAGES.passwordLength)
    .max(128, USER_MESSAGES.passwordLength),
  role: z.enum(STAFF_ROLES, { message: USER_MESSAGES.roleRequired }),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

/** Mudança de papel (`PATCH /users/{id}/role`): id em UUID e papel do enum `Role`. */
export const changeRoleSchema = z.object({
  userId: z.uuid(),
  role: z.enum(ROLE_ORDER),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

/** Query da lista de usuários (`/usuarios?page=`). Página inválida vira 1. */
export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;

type SearchParams = Record<string, string | string[] | undefined>;

/** Valor repetido na URL (`?page=2&page=3`) usa o primeiro; chaves desconhecidas são ignoradas. */
export function parseUserListQuery(params: SearchParams): UserListQuery {
  const page = Array.isArray(params.page) ? params.page[0] : params.page;
  return userListQuerySchema.parse({ page: page ?? 1 });
}
