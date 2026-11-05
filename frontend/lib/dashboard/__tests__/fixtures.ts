import type { Ticket, TicketPriority, TicketStatus } from "@/lib/api/types";

let seq = 0;

export function ticket(status: TicketStatus, priority: TicketPriority = "MEDIUM"): Ticket {
  seq += 1;
  return {
    id: `t${seq}`,
    title: `Chamado ${seq}`,
    description: "descrição longa que não deve chegar à UI",
    status,
    priority,
    category: { id: "c1", name: "Financeiro" },
    customer: { id: "u1", name: "Ana", role: "CUSTOMER" },
    assignee: null,
    createdAt: "2026-10-14T12:00:00.000Z",
    updatedAt: "2026-10-14T12:00:00.000Z",
    closedAt: null,
  };
}

export function page(data: Ticket[], total = data.length) {
  return { data, page: 1, limit: 5, total };
}
