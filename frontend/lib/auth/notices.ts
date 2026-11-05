/**
 * Avisos exibidos na tela de login após um redirecionamento (`?aviso=<código>`).
 * Conjunto fechado: nada do query string é renderizado diretamente.
 */
export const NOTICES = {
  logout: { text: "Você saiu da sua conta.", tone: "info" },
  "sessao-expirada": { text: "Sua sessão expirou. Entre novamente.", tone: "warning" },
  "conta-criada": { text: "Conta criada. Entre para continuar.", tone: "info" },
} as const;

export type NoticeCode = keyof typeof NOTICES;
export type Notice = (typeof NOTICES)[NoticeCode];

export function getNotice(code: unknown): Notice | null {
  if (typeof code !== "string" || !Object.hasOwn(NOTICES, code)) return null;
  return NOTICES[code as NoticeCode];
}

/** Monta `/login` com aviso e destino opcional. */
export function loginUrl(params: { notice?: NoticeCode; next?: string } = {}) {
  const search = new URLSearchParams();
  if (params.next) search.set("next", params.next);
  if (params.notice) search.set("aviso", params.notice);
  const query = search.toString();
  return query ? `/login?${query}` : "/login";
}
