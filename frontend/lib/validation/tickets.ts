import { z } from "zod";
import type { TicketPriority, TicketStatus } from "@/lib/api/types";
import { PRIORITY_ORDER, STATUS_ORDER } from "@/lib/tickets/labels";

// Espelha os enums de "Tickets" em docs/api-reference.md.

export const ticketStatusSchema = z.enum(STATUS_ORDER);
export const ticketPrioritySchema = z.enum(PRIORITY_ORDER);

/**
 * Query da lista de chamados (`/chamados?status=&priority=&page=`).
 * Cada campo inválido é descartado sem invalidar os outros: a lista abre
 * como se ele não tivesse sido informado.
 */
export const ticketListQuerySchema = z.object({
  status: ticketStatusSchema.optional().catch(undefined),
  priority: ticketPrioritySchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

export type TicketListQuery = {
  status?: TicketStatus;
  priority?: TicketPriority;
  page: number;
};

export const TICKET_MESSAGES = {
  titleLength: "O título deve ter entre 5 e 120 caracteres.",
  descriptionLength: "A descrição deve ter entre 10 e 5000 caracteres.",
  priorityRequired: "Selecione a prioridade.",
  categoryRequired: "Selecione uma categoria.",
  categoryUnavailable: "Esta categoria não está mais disponível. Escolha outra.",
} as const;

/** Abertura de chamado (`CreateTicketDto`), com trim antes dos limites. */
export const createTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, TICKET_MESSAGES.titleLength)
    .max(120, TICKET_MESSAGES.titleLength),
  description: z
    .string()
    .trim()
    .min(10, TICKET_MESSAGES.descriptionLength)
    .max(5000, TICKET_MESSAGES.descriptionLength),
  priority: z.enum(PRIORITY_ORDER, { message: TICKET_MESSAGES.priorityRequired }),
  categoryId: z.uuid({ message: TICKET_MESSAGES.categoryRequired }),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

const STATUS_TARGETS = ["WAITING_CUSTOMER", "RESOLVED", "IN_PROGRESS", "CLOSED"] as const;

/**
 * Ação enviada pelo detalhe do chamado. O botão acionado manda
 * `intent` = `assume` | `assign` | `status:<STATUS>`.
 */
export const ticketActionSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("assume"), ticketId: z.uuid() }),
  z.object({ intent: z.literal("assign"), ticketId: z.uuid(), assigneeId: z.uuid() }),
  z.object({ intent: z.literal("status"), ticketId: z.uuid(), to: z.enum(STATUS_TARGETS) }),
]);

export type TicketActionInput = z.infer<typeof ticketActionSchema>;

/** Converte os campos do formulário de ações (`intent=status:RESOLVED`) para o schema. */
export function parseTicketAction(fields: { ticketId: string; intent: string; assigneeId: string }) {
  const [intent, to] = fields.intent.split(":", 2);
  return ticketActionSchema.safeParse({
    intent,
    ticketId: fields.ticketId,
    ...(intent === "assign" ? { assigneeId: fields.assigneeId } : {}),
    ...(intent === "status" ? { to } : {}),
  });
}

type SearchParams = Record<string, string | string[] | undefined>;

/** Valor repetido na URL (`?status=A&status=B`) usa o primeiro. */
function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseTicketListQuery(params: SearchParams): TicketListQuery {
  return ticketListQuerySchema.parse({
    status: first(params.status),
    priority: first(params.priority),
    page: first(params.page) ?? 1,
  });
}
