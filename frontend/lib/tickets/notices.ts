/**
 * Avisos exibidos na lista e no detalhe de chamados após um redirecionamento
 * (`?aviso=<código>`). Conjunto fechado: nada do query string é renderizado.
 */
export const TICKET_NOTICES = {
  "chamado-aberto": "Chamado aberto.",
} as const;

export type TicketNoticeCode = keyof typeof TICKET_NOTICES;

export function getTicketNotice(code: unknown): string | null {
  const value = Array.isArray(code) ? code[0] : code;
  if (typeof value !== "string" || !Object.hasOwn(TICKET_NOTICES, value)) return null;
  return TICKET_NOTICES[value as TicketNoticeCode];
}

/** Acrescenta `aviso=<código>` a uma URL de chamados. */
export function withNotice(href: string, code: TicketNoticeCode): string {
  return `${href}${href.includes("?") ? "&" : "?"}aviso=${code}`;
}
