"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/auth/form-alert";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { SelectField } from "@/components/forms/select-field";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { CreateStaffState } from "@/lib/users/form-state";
import { USERS_HREF } from "@/lib/users/list";
import { USER_TEXT } from "@/lib/users/messages";
import { STAFF_ROLES } from "@/lib/validation/users";
import { createStaffAction } from "./actions";

const initialState: CreateStaffState = {};

const ROLE_OPTIONS = STAFF_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }));

const PASSWORD_HELP_ID = "field-password-help";

/** Cadastro de atendente ou administrador. A senha volta sempre vazia depois de um erro. */
export function NewStaffForm() {
  const [state, formAction, pending] = useActionState(createStaffAction, initialState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form action={formAction} noValidate className="grid gap-5">
      {state.formError ? <FormAlert tone="error">{state.formError}</FormAlert> : null}

      {/*
        `key` pelo valor preservado: o `Input` (Base UI) avisa quando o
        defaultValue de um campo não controlado muda depois de montado, e o
        React reinicia o formulário depois da action. Remontar resolve os dois.
      */}
      <FormField
        key={`name-${values.name ?? ""}`}
        name="name"
        label="Nome"
        autoComplete="off"
        defaultValue={values.name}
        error={errors.name}
      />

      <FormField
        key={`email-${values.email ?? ""}`}
        name="email"
        label="E-mail"
        type="email"
        inputMode="email"
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        defaultValue={values.email}
        error={errors.email}
      />

      <div className="grid gap-2">
        <FormField
          name="password"
          label="Senha"
          type="password"
          autoComplete="new-password"
          error={errors.password}
          // Liga a ajuda fixa ao campo, junto do erro (quando houver).
          aria-describedby={[errors.password ? "field-password-error" : null, PASSWORD_HELP_ID]
            .filter(Boolean)
            .join(" ")}
        />
        <p id={PASSWORD_HELP_ID} className="text-xs text-muted-foreground">
          {USER_TEXT.passwordHelp}
        </p>
      </div>

      {/*
        `key` pelo valor: depois do envio o React reinicia o formulário, e um
        <select> volta ao defaultValue da PRIMEIRA montagem. Remontar faz o
        papel preservado valer.
      */}
      <SelectField
        key={`role-${values.role ?? ""}`}
        name="role"
        label="Papel"
        placeholder="Selecione o papel"
        options={ROLE_OPTIONS}
        defaultValue={values.role ?? ""}
        error={errors.role}
      />

      <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
        <Link
          href={USERS_HREF}
          className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold tracking-[0.05em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {USER_TEXT.cancel}
        </Link>
        <SubmitButton
          pending={pending}
          label={USER_TEXT.createSubmit}
          pendingLabel={USER_TEXT.createPending}
          className="md:w-auto"
        />
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {pending ? USER_TEXT.createAnnounce : ""}
      </p>
    </form>
  );
}
