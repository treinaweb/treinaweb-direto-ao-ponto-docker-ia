import "server-only";

import { cache } from "react";
import { apiFetch } from "./client";
import type { ChangeRoleDto, CreateStaffDto, CreateUserDto, Paginated, PublicUser, Role } from "./types";

/** `POST /users` (público) → 201 usuário `CUSTOMER` | 400 | 409 e-mail já cadastrado. */
export function createUser(data: CreateUserDto): Promise<PublicUser> {
  return apiFetch<PublicUser>("/users", { method: "POST", body: data });
}

/** `GET /users/me` → 200 usuário autenticado | 401. */
export function getMe(accessToken: string): Promise<PublicUser> {
  return apiFetch<PublicUser>("/users/me", { accessToken });
}

/** `GET /users` (ADMIN) → 200 página de usuários (`limit` máx. 100) | 400 | 401 | 403. */
export function listUsers(
  accessToken: string,
  { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
): Promise<Paginated<PublicUser>> {
  return apiFetch<Paginated<PublicUser>>(`/users?page=${page}&limit=${limit}`, { accessToken });
}

/** `POST /users/staff` (ADMIN) → 201 usuário criado | 400 | 401 | 403 | 409 e-mail já cadastrado. */
export function createStaff(accessToken: string, data: CreateStaffDto): Promise<PublicUser> {
  return apiFetch<PublicUser>("/users/staff", { method: "POST", body: data, accessToken });
}

/**
 * `PATCH /users/{id}/role` (ADMIN) → 200 usuário atualizado | 400 | 401 | 403 |
 * 404 | 422 próprio papel. Revoga as sessões do usuário afetado.
 */
export function changeUserRole(accessToken: string, id: string, role: Role): Promise<PublicUser> {
  return apiFetch<PublicUser>(`/users/${encodeURIComponent(id)}/role`, {
    method: "PATCH",
    body: { role } satisfies ChangeRoleDto,
    accessToken,
  });
}

/** Teto de páginas ao montar a lista de atendentes (100 por página → até 2.000 usuários). */
export const SUPPORT_AGENTS_MAX_PAGES = 20;

export type SupportAgent = { id: string; name: string };

/**
 * Todos os usuários `SUPPORT`, em ordem alfabética, para a atribuição pelo
 * ADMIN. `GET /users` não filtra por papel: percorre as páginas (100 por vez)
 * até cobrir o `total`, com teto. DTO enxuto, sem e-mails. Memorizado por
 * renderização.
 */
export const listSupportAgents = cache(async (accessToken: string): Promise<SupportAgent[]> => {
  const agents: SupportAgent[] = [];
  for (let page = 1; page <= SUPPORT_AGENTS_MAX_PAGES; page += 1) {
    const result = await listUsers(accessToken, { page, limit: 100 });
    for (const user of result.data) {
      if (user.role === "SUPPORT") agents.push({ id: user.id, name: user.name });
    }
    if (page * 100 >= result.total || result.data.length === 0) break;
  }
  return agents.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
});
