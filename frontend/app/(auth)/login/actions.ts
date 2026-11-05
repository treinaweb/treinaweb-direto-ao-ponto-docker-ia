"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { login } from "@/lib/api/auth";
import { MESSAGES, isApiError, parseValidationMessages, toUserMessage } from "@/lib/api/errors";
import type { TokenPair } from "@/lib/api/types";
import { writeSession } from "@/lib/auth/cookies";
import type { LoginField, LoginState } from "@/lib/auth/form-state";
import { safeNext } from "@/lib/auth/redirect";
import { AUTH_MESSAGES, loginSchema } from "@/lib/validation/auth";
import { issuesToFieldErrors, readFormFields, toFieldErrors } from "@/lib/validation/form";

const INVALID_CREDENTIALS = "E-mail ou senha inválidos.";

/** Mensagens pt-BR para as violações 400 da API no login. */
const API_FIELD_MESSAGES: Record<LoginField, Record<string, string> & { fallback: string }> = {
  email: { required: AUTH_MESSAGES.emailRequired, fallback: AUTH_MESSAGES.emailInvalid },
  password: {
    required: AUTH_MESSAGES.passwordRequired,
    maxLength: AUTH_MESSAGES.loginPasswordTooLong,
    fallback: AUTH_MESSAGES.passwordRequired,
  },
};

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const raw = readFormFields(formData, ["email", "password", "next"] as const);
  // A senha nunca volta para o cliente.
  const values = { email: raw.email };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors<LoginField>(parsed.error), values };
  }

  let tokens: TokenPair;
  try {
    tokens = await login(parsed.data);
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      return { formError: INVALID_CREDENTIALS, values };
    }
    if (isApiError(error) && error.status === 400) {
      const fieldErrors = issuesToFieldErrors(
        parseValidationMessages(error.messages),
        API_FIELD_MESSAGES,
      );
      return fieldErrors ? { fieldErrors, values } : { formError: MESSAGES.invalidData, values };
    }
    return { formError: toUserMessage(error), values };
  }

  writeSession(await cookies(), tokens);
  redirect(safeNext(raw.next));
}
