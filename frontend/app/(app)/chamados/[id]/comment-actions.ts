"use server";

import { refresh } from "next/cache";
import { MESSAGES, isApiError, parseValidationMessages, toUserMessage } from "@/lib/api/errors";
import { createComment } from "@/lib/api/comments";
import { withSession } from "@/lib/auth/session-action";
import { COMMENT_ERRORS, commentSuccess, unprocessableMessage } from "@/lib/tickets/comment-labels";
import type { CommentField, CommentFormState } from "@/lib/tickets/form-state";
import { COMMENT_MESSAGES, commentSchema } from "@/lib/validation/comments";
import { issuesToFieldErrors, readFormFields, toFieldErrors } from "@/lib/validation/form";

/** Mensagens pt-BR para as violações 400 da API no `body` (class-validator, em inglês). */
const API_FIELD_MESSAGES: Record<CommentField, Record<string, string> & { fallback: string }> = {
  body: {
    required: COMMENT_MESSAGES.required,
    minLength: COMMENT_MESSAGES.required,
    maxLength: COMMENT_MESSAGES.tooLong,
    fallback: COMMENT_MESSAGES.required,
  },
};

/**
 * Envia um comentário pelo detalhe do chamado. Valida no servidor antes de
 * chamar a API; a API é a autoridade sobre quem pode comentar (a regra da tela
 * não é recalculada aqui). Depois do sucesso, de 409 e de 422, `refresh()`
 * re-renderiza a página com o chamado e a conversa relidos. Em todo erro, o
 * texto e a opção de nota interna voltam em `values`.
 */
export async function commentAction(
  prev: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const fields = readFormFields(formData, ["ticketId", "body", "isInternal"]);
  const values = { body: fields.body, isInternal: fields.isInternal === "on" ? "on" : "" };
  const submission = prev.submission ?? 0;

  const parsed = commentSchema.safeParse(fields);
  if (!parsed.success) {
    const fieldErrors = toFieldErrors<CommentField | "ticketId" | "isInternal">(parsed.error);
    return fieldErrors.body
      ? { fieldErrors: { body: fieldErrors.body }, values, submission }
      : { formError: MESSAGES.invalidData, values, submission };
  }
  const { ticketId, body, isInternal } = parsed.data;

  try {
    await withSession((token) => createComment(token, ticketId, { body, isInternal }));
  } catch (error) {
    if (!isApiError(error)) throw error;
    switch (error.status) {
      case 422:
        refresh();
        return { formError: unprocessableMessage(error.messages), values, submission };
      case 409:
        refresh();
        return { formError: COMMENT_ERRORS.conflict, values, submission };
      case 404:
        // Sem refresh: re-renderizar trocaria a página inteira por "não encontrado".
        return { gone: true, formError: COMMENT_ERRORS.gone, submission };
      case 400: {
        const fieldErrors = issuesToFieldErrors(
          parseValidationMessages(error.messages),
          API_FIELD_MESSAGES,
        );
        return fieldErrors
          ? { fieldErrors, values, submission }
          : { formError: MESSAGES.invalidData, values, submission };
      }
      default:
        return { formError: toUserMessage(error), values, submission };
    }
  }

  refresh();
  return { notice: commentSuccess(isInternal), submission: submission + 1 };
}
