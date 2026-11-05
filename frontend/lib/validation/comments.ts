import { z } from "zod";

// Espelha `CreateCommentDto` em docs/api-reference.md ("Validações de formulário").

export const COMMENT_MAX_LENGTH = 5000;

export const COMMENT_MESSAGES = {
  required: "Escreva um comentário.",
  tooLong: `O comentário deve ter no máximo ${COMMENT_MAX_LENGTH} caracteres.`,
} as const;

/**
 * Envio de comentário pelo detalhe do chamado. `body` com trim antes dos
 * limites; `isInternal` vem da caixa de seleção (`"on"` quando marcada).
 */
export const commentSchema = z.object({
  ticketId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, COMMENT_MESSAGES.required)
    .max(COMMENT_MAX_LENGTH, COMMENT_MESSAGES.tooLong),
  isInternal: z
    .string()
    .optional()
    .transform((value) => value === "on" || value === "true"),
});

export type CommentInput = z.infer<typeof commentSchema>;
