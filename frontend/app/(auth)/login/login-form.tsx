"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/auth/form-alert";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import type { LoginState } from "@/lib/auth/form-state";
import { loginAction } from "./actions";

const initialState: LoginState = {};

type LoginFormProps = {
  /** Aviso vindo de outra tela (`?aviso=`), renderizado no servidor. */
  notice?: React.ReactNode;
  /** Campo oculto `next` já validado no servidor. */
  nextField?: React.ReactNode;
};

export function LoginForm({ notice, nextField }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="grid gap-5">
      {state.formError ? <FormAlert tone="error">{state.formError}</FormAlert> : notice}

      {nextField}

      <FormField
        name="email"
        label="E-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        defaultValue={state.values?.email}
        error={errors.email}
      />

      <FormField
        name="password"
        label="Senha"
        type="password"
        autoComplete="current-password"
        error={errors.password}
      />

      <SubmitButton pending={pending} label="Entrar" pendingLabel="Entrando..." />
    </form>
  );
}
