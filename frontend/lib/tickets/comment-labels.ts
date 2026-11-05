/** Textos da conversa e do campo de comentário (pt-BR). */

/** Id do campo de comentário (alvo do atalho "Responder"). */
export const COMMENT_FIELD_ID = "field-body";

export const COMMENT_BLOCKED = {
  closed: "Chamado fechado não aceita novos comentários.",
  assume: "Assuma o chamado para responder.",
} as const;

export const COMMENT_COPY = {
  section: "Comentários",
  empty: "Nenhum comentário ainda.",
  loadError: "Não foi possível carregar os comentários.",
  field: "Comentário",
  help: "Até 5000 caracteres.",
  internalOption: "Nota interna (visível só para a equipe)",
  internalLabel: "Nota interna",
  staffBadge: "Equipe",
  customerBadge: "Cliente",
  backToList: "Voltar aos chamados",
  reply: "Responder",
} as const;

/** Rótulo do botão e texto durante o envio, conforme a opção de nota interna. */
export function submitCopy(isInternal: boolean) {
  return isInternal
    ? { label: "Adicionar nota interna", pending: "Adicionando...", announce: "Adicionando nota interna..." }
    : { label: "Enviar resposta", pending: "Enviando...", announce: "Enviando resposta..." };
}

export function commentSuccess(isInternal: boolean) {
  return isInternal ? "Nota interna adicionada." : "Resposta enviada.";
}

/** Aviso exibido quando a conversa passou do teto de leitura. */
export function truncatedNotice(totalFormatted: string, keptFormatted: string) {
  return `Esta conversa tem ${totalFormatted} comentários. Exibindo os ${keptFormatted} mais recentes.`;
}

export const COMMENT_ERRORS = {
  closed: "Este chamado foi fechado e não aceita novos comentários.",
  notAssignee: "Apenas o atendente atribuído pode comentar neste chamado.",
  notAllowed: "Não é possível comentar na situação atual do chamado.",
  conflict: "Este chamado foi alterado por outra pessoa. Confira a conversa e tente novamente.",
  gone: "Este chamado não está mais disponível para você.",
} as const;

/**
 * Mensagens 422 conhecidas da API → texto pt-BR do frontend. O texto da API
 * nunca é exibido: qualquer outro cai em `COMMENT_ERRORS.notAllowed`.
 */
const UNPROCESSABLE_MESSAGES: Record<string, string> = {
  "Ticket fechado não aceita comentários": COMMENT_ERRORS.closed,
  "Apenas o atendente atribuído pode comentar neste ticket": COMMENT_ERRORS.notAssignee,
};

export function unprocessableMessage(apiMessages: string[]): string {
  return apiMessages.map((m) => UNPROCESSABLE_MESSAGES[m]).find(Boolean) ?? COMMENT_ERRORS.notAllowed;
}
