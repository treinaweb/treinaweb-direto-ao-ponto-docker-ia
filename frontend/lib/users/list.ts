import type { PublicUser, Role } from "@/lib/api/types";

/** Usuários por página na lista (o máximo da API é 100). Decisão de produto: 25. */
export const USERS_PAGE_SIZE = 25;

export const USERS_HREF = "/usuarios";
export const NEW_USER_HREF = "/usuarios/novo";

/** URL da lista na página informada; a página 1 fica implícita. */
export function buildUsersHref(page = 1): string {
  return page > 1 ? `${USERS_HREF}?page=${page}` : USERS_HREF;
}

/** Última página para um total de usuários (pelo menos 1). */
export function lastPageFor(total: number): number {
  return Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));
}

/**
 * DTO enxuto de uma linha da lista. O `id` vai ao navegador porque o
 * formulário de mudança de papel precisa dele; nada mais do objeto da API é
 * serializado. `isSelf` marca a linha do administrador logado.
 */
export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  isSelf: boolean;
};

export function toUserRow(user: PublicUser, currentUserId: string): UserRow {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    isSelf: user.id === currentUserId,
  };
}
