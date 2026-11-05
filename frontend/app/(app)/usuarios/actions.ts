"use server";

import { refresh } from "next/cache";
import { MESSAGES, isApiError, toUserMessage } from "@/lib/api/errors";
import { changeUserRole } from "@/lib/api/users";
import { withSession } from "@/lib/auth/session-action";
import type { RoleChangeState } from "@/lib/users/form-state";
import { USER_TEXT } from "@/lib/users/messages";
import { readFormFields } from "@/lib/validation/form";
import { USER_MESSAGES, changeRoleSchema } from "@/lib/validation/users";

/**
 * Muda o papel de um usuário (`PATCH /users/{id}/role`). Valida id (UUID) e
 * papel antes de chamar a API. A regra do próprio papel é da API (422); a UI
 * só não oferece a ação na linha do administrador logado.
 */
export async function changeRoleAction(
  _prev: RoleChangeState,
  formData: FormData,
): Promise<RoleChangeState> {
  const at = Date.now();
  const fields = readFormFields(formData, ["userId", "role"]);

  if (fields.role === "") {
    return { error: USER_MESSAGES.newRoleRequired, at };
  }
  const parsed = changeRoleSchema.safeParse(fields);
  if (!parsed.success) {
    return { error: MESSAGES.invalidData, at };
  }
  const { userId, role } = parsed.data;

  try {
    await withSession((token) => changeUserRole(token, userId, role));
  } catch (error) {
    if (!isApiError(error)) throw error;
    if (error.status === 404) {
      // A lista continua existindo: relê a página atual sem o usuário.
      refresh();
      return { gone: true, error: USER_TEXT.gone, at };
    }
    return { error: toUserMessage(error), at };
  }

  refresh();
  return { notice: USER_TEXT.roleChanged, at };
}
