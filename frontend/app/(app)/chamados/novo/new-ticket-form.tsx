"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/auth/form-alert";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { SelectField } from "@/components/forms/select-field";
import { TextareaField } from "@/components/forms/textarea-field";
import type { TicketPriority } from "@/lib/api/types";
import type { CreateTicketState } from "@/lib/tickets/form-state";
import { PRIORITY_LABELS } from "@/lib/tickets/labels";
import { LIST_HREF } from "@/lib/tickets/list";
import { createTicketAction } from "./actions";

const initialState: CreateTicketState = {};

/** Da menos para a mais urgente, como o usuário costuma ler a escala. */
const PRIORITY_OPTIONS = (["LOW", "MEDIUM", "HIGH", "URGENT"] as TicketPriority[]).map((p) => ({
  value: p,
  label: PRIORITY_LABELS[p],
}));

const DEFAULT_PRIORITY: TicketPriority = "MEDIUM";

export function NewTicketForm({ categories }: { categories: Array<{ id: string; name: string }> }) {
  const [state, formAction, pending] = useActionState(createTicketAction, initialState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form action={formAction} noValidate className="grid gap-5">
      {state.formError ? <FormAlert tone="error">{state.formError}</FormAlert> : null}

      <FormField
        name="title"
        label="Título"
        maxLength={120}
        defaultValue={values.title}
        error={errors.title}
      />
      <p className="-mt-3 text-xs text-muted-foreground">Entre 5 e 120 caracteres.</p>

      <TextareaField
        name="description"
        label="Descrição"
        help="Conte o que está acontecendo. Entre 10 e 5000 caracteres."
        maxLength={5000}
        defaultValue={values.description}
        error={errors.description}
      />

      {/*
        `key` pelo valor: depois do envio o React reinicia o formulário, e um
        <select> volta ao defaultValue da PRIMEIRA montagem (mudanças posteriores
        de defaultValue são ignoradas). Remontar faz o valor preservado valer.
      */}
      <div className="grid gap-5 md:grid-cols-2">
        <SelectField
          key={`priority-${values.priority ?? DEFAULT_PRIORITY}`}
          name="priority"
          label="Prioridade"
          options={PRIORITY_OPTIONS}
          defaultValue={values.priority ?? DEFAULT_PRIORITY}
          error={errors.priority}
        />
        <SelectField
          key={`category-${values.categoryId ?? ""}`}
          name="categoryId"
          label="Categoria"
          placeholder="Selecione uma categoria"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          defaultValue={values.categoryId ?? ""}
          error={errors.categoryId}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
        <Link
          href={LIST_HREF}
          className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold tracking-[0.05em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Cancelar
        </Link>
        <SubmitButton
          pending={pending}
          label="Abrir chamado"
          pendingLabel="Abrindo..."
          className="md:w-auto"
        />
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {pending ? "Abrindo chamado..." : ""}
      </p>
    </form>
  );
}
