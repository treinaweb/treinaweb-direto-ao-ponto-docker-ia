import "server-only";

import { countTickets, listTickets } from "@/lib/api/tickets";
import type { TicketStatus } from "@/lib/api/types";
import { PRIORITY_ORDER } from "@/lib/tickets/labels";
import { type PriorityCount, type StatusCount, type TicketItem, toTicketItem } from "./types";

/**
 * Para o SUPPORT a API devolve a fila (OPEN sem atendente) + os atribuídos a
 * ele. Como um chamado atribuído sai de OPEN, "OPEN" = fila; os demais status
 * contam só os chamados do próprio atendente.
 */
const KPI_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED"];
const QUEUE_LIMIT = 5;

export async function getSupportKpis(accessToken: string): Promise<StatusCount[]> {
  const counts = await Promise.all(KPI_STATUSES.map((s) => countTickets(accessToken, s)));
  return KPI_STATUSES.map((status, i) => ({ status, count: counts[i] }));
}

/** "Próximos da fila": até 5 chamados OPEN, mais recentes primeiro. */
export async function getQueueTickets(accessToken: string): Promise<TicketItem[]> {
  const page = await listTickets(accessToken, { status: "OPEN", limit: QUEUE_LIMIT });
  return page.data.map(toTicketItem);
}

/** "Fila por prioridade": `status=OPEN&priority=X` (os filtros combinam como "E"). */
export async function getQueueByPriority(accessToken: string): Promise<PriorityCount[]> {
  const counts = await Promise.all(
    PRIORITY_ORDER.map((priority) => countTickets(accessToken, "OPEN", priority)),
  );
  return PRIORITY_ORDER.map((priority, i) => ({ priority, count: counts[i] }));
}
