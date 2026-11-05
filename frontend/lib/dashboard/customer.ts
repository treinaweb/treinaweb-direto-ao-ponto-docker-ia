import "server-only";

import { countTickets, listTickets } from "@/lib/api/tickets";
import type { TicketStatus } from "@/lib/api/types";
import { type StatusCount, type TicketItem, toTicketItem } from "./types";

const KPI_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED"];
const LIST_LIMIT = 5;

/** Cartões do cliente: quantidade dos próprios chamados por status. */
export async function getCustomerKpis(accessToken: string): Promise<StatusCount[]> {
  const counts = await Promise.all(KPI_STATUSES.map((s) => countTickets(accessToken, s)));
  return KPI_STATUSES.map((status, i) => ({ status, count: counts[i] }));
}

export type AttentionItem = TicketItem & { action: "reply" | "confirm" };

/**
 * "Precisam da sua atenção": primeiro os que aguardam resposta do cliente,
 * depois os resolvidos que ele pode confirmar ou reabrir. Até 5 no total.
 */
export async function getAttentionTickets(accessToken: string): Promise<AttentionItem[]> {
  const [waiting, resolved] = await Promise.all([
    listTickets(accessToken, { status: "WAITING_CUSTOMER", limit: LIST_LIMIT }),
    listTickets(accessToken, { status: "RESOLVED", limit: LIST_LIMIT }),
  ]);
  return [
    ...waiting.data.map((t) => ({ ...toTicketItem(t), action: "reply" as const })),
    ...resolved.data.map((t) => ({ ...toTicketItem(t), action: "confirm" as const })),
  ].slice(0, LIST_LIMIT);
}

/** "Chamados recentes": os 5 mais novos (a API já ordena do mais recente). */
export async function getRecentTickets(accessToken: string): Promise<TicketItem[]> {
  const page = await listTickets(accessToken, { limit: LIST_LIMIT });
  return page.data.map(toTicketItem);
}
