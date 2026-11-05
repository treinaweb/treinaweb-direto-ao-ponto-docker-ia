/**
 * Avisos exibidos na lista de usuários após um redirecionamento
 * (`?aviso=<código>`). Conjunto fechado: nada do query string é renderizado.
 */
export const USER_NOTICES = {
  "usuario-cadastrado": "Usuário cadastrado.",
} as const;

export type UserNoticeCode = keyof typeof USER_NOTICES;

export function getUserNotice(code: unknown): string | null {
  const value = Array.isArray(code) ? code[0] : code;
  if (typeof value !== "string" || !Object.hasOwn(USER_NOTICES, value)) return null;
  return USER_NOTICES[value as UserNoticeCode];
}

/** Acrescenta `aviso=<código>` a uma URL da lista de usuários. */
export function withUserNotice(href: string, code: UserNoticeCode): string {
  return `${href}${href.includes("?") ? "&" : "?"}aviso=${code}`;
}
