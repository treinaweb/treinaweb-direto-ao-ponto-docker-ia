"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { commentAction } from "@/app/(app)/chamados/[id]/comment-actions";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextareaField } from "@/components/forms/textarea-field";
import { COMMENT_BLOCKED, COMMENT_COPY, COMMENT_FIELD_ID, submitCopy } from "@/lib/tickets/comment-labels";
import type { CommentAccess } from "@/lib/tickets/comments";
import type { CommentFormState } from "@/lib/tickets/form-state";
import { LIST_HREF } from "@/lib/tickets/list";
import { COMMENT_MAX_LENGTH } from "@/lib/validation/comments";

const initialState: CommentFormState = {};

/**
 * Campo de comentário do detalhe. Fica sempre montado (mesmo quando o campo
 * vira um texto de bloqueio) para que a mensagem do resultado sobreviva ao
 * `refresh()` da Server Action. O que aparece vem de `access`, calculado no
 * servidor.
 */
export function CommentComposer({ ticketId, access }: { ticketId: string; access: CommentAccess }) {
  const [state, formAction, pending] = useActionState(commentAction, initialState);

  // Foco no campo depois de um comentário aceito e de erro no próprio campo.
  useEffect(() => {
    if (state.notice || state.fieldErrors?.body) {
      document.getElementById(COMMENT_FIELD_ID)?.focus();
    }
  }, [state]);

  return (
    <CommentComposerView
      ticketId={ticketId}
      access={access}
      state={state}
      formAction={formAction}
      pending={pending}
    />
  );
}

/** Apresentação do campo a partir do estado da action (separada para os testes). */
export function CommentComposerView({
  ticketId,
  access,
  state,
  formAction,
  pending,
}: {
  ticketId: string;
  access: CommentAccess;
  state: CommentFormState;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  if (state.gone) {
    return (
      <div className="grid gap-3">
        <FormAlert tone="error">{state.formError}</FormAlert>
        <Link
          href={LIST_HREF}
          className="inline-flex min-h-11 w-fit items-center font-medium text-primary underline-offset-4 hover:underline"
        >
          {COMMENT_COPY.backToList}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {state.notice ? <FormAlert tone="info">{state.notice}</FormAlert> : null}
      {state.formError ? <FormAlert tone="error">{state.formError}</FormAlert> : null}

      {access.kind === "blocked" ? (
        <p className="text-sm text-muted-foreground">{COMMENT_BLOCKED[access.reason]}</p>
      ) : null}

      {access.kind === "composer" ? (
        <form action={formAction} noValidate className="grid gap-3 rounded-lg bg-background p-3 md:p-4">
          <input type="hidden" name="ticketId" value={ticketId} />
          {/*
            `key`: o React reinicia o formulário depois de cada action. Remontar
            pelos valores faz o texto e a opção voltarem no erro e ficarem
            vazios depois de um comentário aceito (`submission` muda).
          */}
          <ComposerFields
            key={`${state.submission ?? 0}:${state.values?.isInternal ?? ""}:${state.values?.body ?? ""}`}
            body={state.values?.body ?? ""}
            internal={state.values?.isInternal === "on"}
            error={state.fieldErrors?.body}
            canInternal={access.canInternal}
            pending={pending}
          />
        </form>
      ) : null}
    </div>
  );
}

function ComposerFields({
  body,
  internal: initialInternal,
  error,
  canInternal,
  pending,
}: {
  body: string;
  internal: boolean;
  error?: string;
  canInternal: boolean;
  pending: boolean;
}) {
  // Espelho do `checked` só para o rótulo do botão; o valor enviado é o do formulário.
  const [internal, setInternal] = useState(canInternal && initialInternal);
  const copy = submitCopy(internal);

  return (
    <>
      <div
        data-internal={internal || undefined}
        className="[&[data-internal]_textarea]:border-internal-note-border [&[data-internal]_textarea]:ring-1 [&[data-internal]_textarea]:ring-internal-note-border"
      >
        <TextareaField
          name="body"
          label={COMMENT_COPY.field}
          help={COMMENT_COPY.help}
          maxLength={COMMENT_MAX_LENGTH}
          rows={4}
          defaultValue={body}
          readOnly={pending}
          error={error}
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {canInternal ? (
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="isInternal"
              defaultChecked={internal}
              disabled={pending}
              onChange={(event) => setInternal(event.target.checked)}
              className="size-5 accent-primary"
            />
            {COMMENT_COPY.internalOption}
          </label>
        ) : (
          <span className="hidden md:block" />
        )}
        <SubmitButton
          pending={pending}
          label={copy.label}
          pendingLabel={copy.pending}
          className="md:w-auto"
        />
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {pending ? copy.announce : ""}
      </p>
    </>
  );
}
