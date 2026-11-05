import type { Role, Ticket, TicketPriority, TicketStatus } from "@/lib/api/types";

/** Chamados por página na lista (o máximo da API é 50). */
export const LIST_PAGE_SIZE = 20;

export const LIST_HREF = "/chamados";

export type ListFilters = { status?: TicketStatus; priority?: TicketPriority };

/** URL da lista com os filtros; a página 1 fica implícita. */
export function buildListHref(filters: ListFilters, page = 1): string {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.priority) query.set("priority", filters.priority);
  if (page > 1) query.set("page", String(page));
  return query.size > 0 ? `${LIST_HREF}?${query}` : LIST_HREF;
}

export function hasFilters(filters: ListFilters): boolean {
  return Boolean(filters.status || filters.priority);
}

export type Pagination = {
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  /** Página pedida além da última, havendo chamados. */
  outOfRange: boolean;
};

export function getPagination(total: number, page: number, limit = LIST_PAGE_SIZE): Pagination {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    totalPages,
    hasPrev: page > 1 && page <= totalPages,
    hasNext: page < totalPages,
    outOfRange: total > 0 && page > totalPages,
  };
}

/**
 * DTO enxuto de uma linha da lista. Cliente e atendente só vão para a
 * equipe; descrição, e-mails e ids de usuários nunca saem do servidor.
 * `assignee: null` é exibido como "Na fila".
 */
export type TicketRow = {
  id: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  createdAt: string;
  customer?: string;
  assignee?: string | null;
};

export function isStaff(role: Role): boolean {
  return role === "SUPPORT" || role === "ADMIN";
}

export function toTicketRow(ticket: Ticket, role: Role): TicketRow {
  const row: TicketRow = {
    id: ticket.id,
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category.name,
    createdAt: ticket.createdAt,
  };
  if (isStaff(role)) {
    row.customer = ticket.customer.name;
    row.assignee = ticket.assignee?.name ?? null;
  }
  return row;
}
