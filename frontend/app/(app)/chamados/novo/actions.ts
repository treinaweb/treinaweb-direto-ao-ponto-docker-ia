"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { MESSAGES, isApiError, parseValidationMessages, toUserMessage } from "@/lib/api/errors";
import { createTicket } from "@/lib/api/tickets";
import { withSession } from "@/lib/auth/session-action";
import type { CreateTicketField, CreateTicketState } from "@/lib/tickets/form-state";
import { withNotice } from "@/lib/tickets/notices";
import { TICKET_MESSAGES, createTicketSchema } from "@/lib/validation/tickets";
import { issuesToFieldErrors, readFormFields, toFieldErrors } from "@/lib/validation/form";

const FIELDS = ["title", "description", "priority", "categoryId"] as const;

/** Mensagens pt-BR para as violações 400 da API na abertura de chamado. */
const API_FIELD_MESSAGES: Record<
  CreateTicketField,
  Record<string, string> & { fallback: string }
> = {
  title: { fallback: TICKET_MESSAGES.titleLength },
  description: { fallback: TICKET_MESSAGES.descriptionLength },
  priority: { fallback: TICKET_MESSAGES.priorityRequired },
  categoryId: { fallback: TICKET_MESSAGES.categoryRequired },
};

export async function createTicketAction(
  _prev: CreateTicketState,
  formData: FormData,
): Promise<CreateTicketState> {
  // Os valores brutos voltam em qualquer erro: o cliente não perde o que escreveu.
  const values = readFormFields(formData, FIELDS);

  const parsed = createTicketSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors<CreateTicketField>(parsed.error), values };
  }

  let ticketId: string;
  try {
    const ticket = await withSession((token) => createTicket(token, parsed.data));
    ticketId = ticket.id;
  } catch (error) {
    if (!isApiError(error)) throw error;

    if (error.status === 422) {
      // Categoria desativada entre abrir o formulário e enviar: recarrega as opções.
      refresh();
      return {
        fieldErrors: { categoryId: TICKET_MESSAGES.categoryUnavailable },
        values: { ...values, categoryId: "" },
      };
    }
    if (error.status === 400) {
      const fieldErrors = issuesToFieldErrors(
        parseValidationMessages(error.messages),
        API_FIELD_MESSAGES,
      );
      return fieldErrors ? { fieldErrors, values } : { formError: MESSAGES.invalidData, values };
    }
    return { formError: toUserMessage(error), values };
  }

  // O cliente vê o chamado recém-criado, com o aviso de confirmação.
  redirect(withNotice(`/chamados/${ticketId}`, "chamado-aberto"));
}
