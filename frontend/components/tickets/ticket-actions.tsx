"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ticketAction, type TicketActionState } from "@/app/(app)/chamados/[id]/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { actionCopy } from "@/lib/tickets/action-labels";
import type { TicketAction } from "@/lib/tickets/actions";
import { LIST_HREF } from "@/lib/tickets/list";
import { ActionButton } from "./action-button";
import { CloseTicketButton } from "./close-ticket-button";

const FORM_ID = "ticket-actions";
const initialState: TicketActionState = {};

/**
 * Ações do chamado num único formulário (todas desabilitadas durante um
 * envio). Fica sempre montado, mesmo sem ações, para que a mensagem de
 * resultado sobreviva ao `refresh()` (ex.: "Chamado fechado." quando as ações
 * somem). `assignSlot` é a escolha de atendente, renderizada no servidor.
 */
export function TicketActions({
  ticketId,
  actions,
  assignSlot,
}: {
  ticketId: string;
  actions: TicketAction[];
  assignSlot?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(ticketAction, initialState);

  if (state.gone) {
    return (
      <section className="grid gap-3 rounded-panel bg-card p-4 text-card-foreground md:p-6">
        <FormAlert tone="error">{state.error}</FormAlert>
        <Link
          href={LIST_HREF}
          className="inline-flex min-h-11 w-fit items-center font-medium text-primary underline-offset-4 hover:underline"
        >
          Voltar aos chamados
        </Link>
      </section>
    );
  }

  return (
    <div className="grid gap-3">
      {state.notice ? <FormAlert tone="info">{state.notice}</FormAlert> : null}
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}

      {actions.length > 0 ? (
        <section
          aria-label="Ações do chamado"
          className="rounded-panel bg-card p-4 text-card-foreground md:p-6"
        >
          <form id={FORM_ID} action={formAction} className="grid gap-3">
            <input type="hidden" name="ticketId" value={ticketId} />
            {actions.map((action) => {
              if (action.kind === "assign") {
                return <div key="assign">{assignSlot}</div>;
              }
              if (action.kind === "status" && action.to === "CLOSED") {
                return <CloseTicketButton key="close" formId={FORM_ID} />;
              }
              const intent = action.kind === "assume" ? "assume" : `status:${action.to}`;
              const copy = actionCopy(action);
              return (
                <ActionButton
                  key={intent}
                  intent={intent}
                  label={copy.label}
                  pendingLabel={copy.pending}
                  tone={copy.tone}
                />
              );
            })}
          </form>
        </section>
      ) : null}
    </div>
  );
}
