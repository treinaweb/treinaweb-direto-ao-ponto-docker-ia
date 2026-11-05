import type { FormState } from "@/lib/auth/form-state";

/** Campos do formulário "Abrir chamado". */
export type CreateTicketField = "title" | "description" | "priority" | "categoryId";

/** Estado da Server Action de abertura: todos os valores voltam em caso de erro. */
export type CreateTicketState = FormState<CreateTicketField, CreateTicketField>;

/** Campo do formulário de comentário (com erro) e valores preservados em caso de erro. */
export type CommentField = "body";

/**
 * Estado da Server Action de comentário. `values.isInternal` é `"on"` quando a
 * opção de nota interna estava marcada. `submission` cresce a cada comentário
 * aceito (remonta o campo vazio); `gone` indica 404 (chamado indisponível).
 */
export type CommentFormState = FormState<CommentField, "body" | "isInternal"> & {
  notice?: string;
  gone?: boolean;
  submission?: number;
};
