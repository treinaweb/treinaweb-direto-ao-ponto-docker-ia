import type { TicketPriority, TicketStatus } from "@/lib/api/types";

/** Rótulos pt-BR de status e prioridade (sempre exibidos junto com a cor). */
export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  WAITING_CUSTOMER: "Aguardando cliente",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado",
};

/** Plural usado em legendas e totais ("Fechados 5"). */
export const STATUS_LABELS_PLURAL: Record<TicketStatus, string> = {
  OPEN: "Abertos",
  IN_PROGRESS: "Em andamento",
  WAITING_CUSTOMER: "Aguardando cliente",
  RESOLVED: "Resolvidos",
  CLOSED: "Fechados",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  URGENT: "Urgente",
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

/** Ordem de exibição: o ciclo de vida do chamado. */
export const STATUS_ORDER: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

/** Ordem de exibição: da mais para a menos urgente. */
export const PRIORITY_ORDER: TicketPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];
