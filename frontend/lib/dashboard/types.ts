import type { Ticket, TicketPriority, TicketStatus } from "@/lib/api/types";

/** DTO enxuto de um chamado nas listas do painel (sem descrição nem e-mails). */
export type TicketItem = {
  id: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  customer: string;
  createdAt: string;
};

export type StatusCount = { status: TicketStatus; count: number };
export type PriorityCount = { priority: TicketPriority; count: number };

export function toTicketItem(ticket: Ticket): TicketItem {
  return {
    id: ticket.id,
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category.name,
    customer: ticket.customer.name,
    createdAt: ticket.createdAt,
  };
}
