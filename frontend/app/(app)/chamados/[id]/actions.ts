"use server";

import { refresh } from "next/cache";
import { MESSAGES, isApiError, toUserMessage } from "@/lib/api/errors";
import { assignTicket, updateTicketStatus } from "@/lib/api/tickets";
import { withSession } from "@/lib/auth/session-action";
import { ACTION_ERRORS, successMessage } from "@/lib/tickets/action-labels";
import { readFormFields } from "@/lib/validation/form";
import { parseTicketAction } from "@/lib/validation/tickets";

/** Resultado de uma ação no detalhe do chamado. */
export type TicketActionState = {
  notice?: string;
  error?: string;
  /** 404: o chamado saiu da visibilidade do usuário. */
  gone?: boolean;
};

/**
 * Executa uma ação do detalhe (assumir, atribuir ou mudar status). A API é a
 * autoridade: a matriz de permissões não é recalculada aqui. Depois do sucesso
 * e de 409/422, `refresh()` re-renderiza a página com o chamado relido, na
 * mesma resposta que leva o estado ao `useActionState`.
 */
export async function ticketAction(
  _prev: TicketActionState,
  formData: FormData,
): Promise<TicketActionState> {
  const parsed = parseTicketAction(readFormFields(formData, ["ticketId", "intent", "assigneeId"]));
  if (!parsed.success) {
    return { error: MESSAGES.invalidData };
  }
  const input = parsed.data;

  let notice: string;
  try {
    const ticket = await withSession((token) => {
      switch (input.intent) {
        case "assume":
          return assignTicket(token, input.ticketId);
        case "assign":
          return assignTicket(token, input.ticketId, input.assigneeId);
        case "status":
          return updateTicketStatus(token, input.ticketId, input.to);
      }
    });
    notice =
      input.intent === "assign"
        ? successMessage({ kind: "assign", assigneeName: ticket.assignee?.name ?? "" })
        : input.intent === "assume"
          ? successMessage({ kind: "assume" })
          : successMessage({ kind: "status", to: input.to });
  } catch (error) {
    if (!isApiError(error)) throw error;
    switch (error.status) {
      case 409:
        refresh();
        return { error: ACTION_ERRORS.conflict };
      case 422:
        refresh();
        return { error: ACTION_ERRORS.notAllowed };
      case 404:
        // Sem refresh: re-renderizar trocaria a página inteira por "não encontrado".
        return { gone: true, error: ACTION_ERRORS.gone };
      default:
        return { error: toUserMessage(error) };
    }
  }

  refresh();
  return { notice };
}
