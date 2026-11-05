import "server-only";

import { cache } from "react";
import { apiFetch } from "./client";
import type {
  AssignTicketDto,
  CreateTicketDto,
  Paginated,
  Ticket,
  TicketPriority,
  TicketStatus,
  UpdateStatusDto,
} from "./types";

export type TicketFilters = {
  page?: number;
  /** Máximo 50 na API. */
  limit?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
};

/**
 * `GET /tickets` → 200 página de tickets visíveis ao papel (mais recentes
 * primeiro) | 400 | 401.
 */
export function listTickets(accessToken: string, filters: TicketFilters = {}) {
  const query = new URLSearchParams();
  for (const key of ["page", "limit", "status", "priority"] as const) {
    const value = filters[key];
    if (value !== undefined) query.set(key, String(value));
  }
  const suffix = query.size > 0 ? `?${query}` : "";
  return apiFetch<Paginated<Ticket>>(`/tickets${suffix}`, { accessToken });
}

/**
 * Quantidade de tickets visíveis com os filtros (lê só o `total`).
 * Memorizado por renderização: argumentos primitivos para o `cache` do React
 * reaproveitar a mesma chamada entre cartões e gráficos.
 */
export const countTickets = cache(
  async (accessToken: string, status?: TicketStatus, priority?: TicketPriority) => {
    const page = await listTickets(accessToken, { limit: 1, status, priority });
    return page.total;
  },
);

/**
 * `POST /tickets` → 201 ticket criado (`OPEN`, sem atendente) | 400 | 401 |
 * 403 papel diferente de CUSTOMER | 422 categoria inexistente ou inativa.
 */
export function createTicket(accessToken: string, dto: CreateTicketDto) {
  return apiFetch<Ticket>("/tickets", { method: "POST", body: dto, accessToken });
}

/** `GET /tickets/{id}` → 200 ticket | 400 id malformado | 401 | 404 inexistente ou fora da visibilidade. */
export function getTicket(accessToken: string, id: string) {
  return apiFetch<Ticket>(`/tickets/${encodeURIComponent(id)}`, { accessToken });
}

/**
 * `PATCH /tickets/{id}/assign` → 200 ticket (OPEN atribuído vira IN_PROGRESS) |
 * 400 | 401 | 403 | 404 | 409 concorrência | 422 regra de atribuição.
 * Sem `assigneeId` o corpo vai vazio: o SUPPORT assume para si.
 */
export function assignTicket(accessToken: string, id: string, assigneeId?: string) {
  const body: AssignTicketDto = assigneeId ? { assigneeId } : {};
  return apiFetch<Ticket>(`/tickets/${encodeURIComponent(id)}/assign`, {
    method: "PATCH",
    body,
    accessToken,
  });
}

/** `PATCH /tickets/{id}/status` → 200 ticket | 400 | 401 | 404 | 409 | 422 transição inválida. */
export function updateTicketStatus(accessToken: string, id: string, status: TicketStatus) {
  const body: UpdateStatusDto = { status };
  return apiFetch<Ticket>(`/tickets/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body,
    accessToken,
  });
}
