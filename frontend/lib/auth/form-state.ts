import type { FieldErrors } from "@/lib/validation/form";

/** Estado devolvido pelas Server Actions de formulário (nunca contém senhas). */
export type FormState<Field extends string, Value extends string = never> = {
  fieldErrors?: FieldErrors<Field>;
  formError?: string;
  values?: Partial<Record<Value, string>>;
};

export type LoginField = "email" | "password";
export type LoginState = FormState<LoginField, "email">;

export type SignupField = "name" | "email" | "password" | "confirmPassword";
export type SignupState = FormState<SignupField, "name" | "email">;
