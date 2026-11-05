"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { login } from "@/lib/api/auth";
import { MESSAGES, isApiError, parseValidationMessages, toUserMessage } from "@/lib/api/errors";
import type { TokenPair } from "@/lib/api/types";
import { createUser } from "@/lib/api/users";
import { writeSession } from "@/lib/auth/cookies";
import type { SignupField, SignupState } from "@/lib/auth/form-state";
import { loginUrl } from "@/lib/auth/notices";
import { DEFAULT_AFTER_LOGIN } from "@/lib/auth/redirect";
import { AUTH_MESSAGES, signupSchema } from "@/lib/validation/auth";
import { issuesToFieldErrors, readFormFields, toFieldErrors } from "@/lib/validation/form";

/** Mensagens pt-BR para as violações 400 da API no cadastro. */
const API_FIELD_MESSAGES: Record<
  Exclude<SignupField, "confirmPassword">,
  Record<string, string> & { fallback: string }
> = {
  name: { required: AUTH_MESSAGES.nameRequired, fallback: AUTH_MESSAGES.nameLength },
  email: {
    required: AUTH_MESSAGES.emailRequired,
    maxLength: AUTH_MESSAGES.emailTooLong,
    fallback: AUTH_MESSAGES.emailInvalid,
  },
  password: { required: AUTH_MESSAGES.newPasswordRequired, fallback: AUTH_MESSAGES.passwordLength },
};

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const raw = readFormFields(formData, ["name", "email", "password", "confirmPassword"] as const);
  // Senhas nunca voltam para o cliente.
  const values = { name: raw.name, email: raw.email };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors<SignupField>(parsed.error), values };
  }
  const { name, email, password } = parsed.data;

  try {
    await createUser({ name, email, password });
  } catch (error) {
    if (isApiError(error) && error.status === 409) {
      return { fieldErrors: { email: AUTH_MESSAGES.emailTaken }, values };
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

  // Conta criada: entra automaticamente. Se falhar, NÃO recria a conta.
  let tokens: TokenPair;
  try {
    tokens = await login({ email, password });
  } catch {
    redirect(loginUrl({ notice: "conta-criada" }));
  }

  writeSession(await cookies(), tokens);
  redirect(DEFAULT_AFTER_LOGIN);
}
