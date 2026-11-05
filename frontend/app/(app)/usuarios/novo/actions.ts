"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { MESSAGES, isApiError, parseValidationMessages, toUserMessage } from "@/lib/api/errors";
import { createStaff, listUsers } from "@/lib/api/users";
import { withSession } from "@/lib/auth/session-action";
import type { CreateStaffField, CreateStaffState } from "@/lib/users/form-state";
import { buildUsersHref, lastPageFor } from "@/lib/users/list";
import { withUserNotice } from "@/lib/users/notices";
import { issuesToFieldErrors, readFormFields, toFieldErrors } from "@/lib/validation/form";
import { USER_MESSAGES, createStaffSchema } from "@/lib/validation/users";

const FIELDS = ["name", "email", "password", "role"] as const;

/** Mensagens pt-BR para as violações 400 da API no cadastro de equipe. */
const API_FIELD_MESSAGES: Record<CreateStaffField, Record<string, string> & { fallback: string }> = {
  name: { required: USER_MESSAGES.nameRequired, fallback: USER_MESSAGES.nameLength },
  email: {
    required: USER_MESSAGES.emailRequired,
    maxLength: USER_MESSAGES.emailTooLong,
    fallback: USER_MESSAGES.emailInvalid,
  },
  password: { required: USER_MESSAGES.passwordRequired, fallback: USER_MESSAGES.passwordLength },
  role: { fallback: USER_MESSAGES.roleRequired },
};

/**
 * Cadastra um atendente ou administrador (`POST /users/staff`) e leva à
 * última página da lista, onde o usuário novo aparece (a API ordena dos mais
 * antigos para os mais recentes).
 */
export async function createStaffAction(
  _prev: CreateStaffState,
  formData: FormData,
): Promise<CreateStaffState> {
  const raw = readFormFields(formData, FIELDS);
  // A senha nunca volta para o navegador.
  const values = { name: raw.name, email: raw.email, role: raw.role };

  const parsed = createStaffSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors<CreateStaffField>(parsed.error), values };
  }

  try {
    await withSession((token) => createStaff(token, parsed.data));
  } catch (error) {
    if (!isApiError(error)) throw error;
    if (error.status === 409) {
      return { fieldErrors: { email: USER_MESSAGES.emailTaken }, values };
    }
    if (error.status === 400) {
      const fieldErrors = issuesToFieldErrors(
        parseValidationMessages(error.messages),
        API_FIELD_MESSAGES,
      );
      return fieldErrors ? { fieldErrors, values } : { formError: MESSAGES.invalidData, values };
    }
    return { formError: toUserMessage(error), values };
  }

  // Usuário já criado: nenhuma falha daqui em diante tenta criar de novo. Se o
  // total não puder ser lido, a lista abre na página 1 (com o mesmo aviso).
  let page = 1;
  try {
    const { total } = await withSession((token) => listUsers(token, { page: 1, limit: 1 }));
    page = lastPageFor(total);
  } catch (error) {
    unstable_rethrow(error);
  }

  redirect(withUserNotice(buildUsersHref(page), "usuario-cadastrado"));
}
