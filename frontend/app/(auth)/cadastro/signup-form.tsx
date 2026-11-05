"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/auth/form-alert";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import type { SignupState } from "@/lib/auth/form-state";
import { signupAction } from "./actions";

const initialState: SignupState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="grid gap-5">
      {state.formError ? <FormAlert tone="error">{state.formError}</FormAlert> : null}

      <FormField
        name="name"
        label="Nome"
        autoComplete="name"
        defaultValue={state.values?.name}
        error={errors.name}
      />

      <div className="grid gap-2">
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
        {errors.email === "Este e-mail já está cadastrado." ? (
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Entrar com este e-mail
          </Link>
        ) : null}
      </div>

      <FormField
        name="password"
        label="Senha"
        type="password"
        autoComplete="new-password"
        error={errors.password}
      />

      <FormField
        name="confirmPassword"
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword}
      />

      <SubmitButton pending={pending} label="Criar conta" pendingLabel="Criando conta..." />
    </form>
  );
}
