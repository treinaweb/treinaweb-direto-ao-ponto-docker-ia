import { z } from "zod";

// Espelha "Validações de formulário" de docs/api-reference.md.
// Mensagens sempre explícitas em pt-BR.

export const AUTH_MESSAGES = {
  emailRequired: "Informe seu e-mail.",
  emailInvalid: "Informe um e-mail válido.",
  emailTooLong: "O e-mail deve ter no máximo 200 caracteres.",
  /** 409 do cadastro público e do cadastro de equipe. */
  emailTaken: "Este e-mail já está cadastrado.",
  passwordRequired: "Informe sua senha.",
  loginPasswordTooLong: "A senha deve ter no máximo 128 caracteres.",
  nameRequired: "Informe seu nome.",
  nameLength: "O nome deve ter entre 2 e 100 caracteres.",
  newPasswordRequired: "Crie uma senha.",
  passwordLength: "A senha deve ter entre 8 e 128 caracteres.",
  confirmRequired: "Confirme sua senha.",
  passwordMismatch: "As senhas não conferem.",
} as const;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, AUTH_MESSAGES.emailRequired)
    .pipe(z.email(AUTH_MESSAGES.emailInvalid)),
  password: z
    .string()
    .min(1, AUTH_MESSAGES.passwordRequired)
    .max(128, AUTH_MESSAGES.loginPasswordTooLong),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, AUTH_MESSAGES.nameRequired)
      .min(2, AUTH_MESSAGES.nameLength)
      .max(100, AUTH_MESSAGES.nameLength),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, AUTH_MESSAGES.emailRequired)
      .max(200, AUTH_MESSAGES.emailTooLong)
      .pipe(z.email(AUTH_MESSAGES.emailInvalid)),
    password: z
      .string()
      .min(1, AUTH_MESSAGES.newPasswordRequired)
      .min(8, AUTH_MESSAGES.passwordLength)
      .max(128, AUTH_MESSAGES.passwordLength),
    confirmPassword: z.string().min(1, AUTH_MESSAGES.confirmRequired),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    error: AUTH_MESSAGES.passwordMismatch,
  });

export type SignupInput = z.infer<typeof signupSchema>;
