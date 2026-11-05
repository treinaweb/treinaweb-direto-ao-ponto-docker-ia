import "server-only";

import { listCategories } from "@/lib/api/categories";
import { countTickets } from "@/lib/api/tickets";
import type { TicketStatus } from "@/lib/api/types";
import { listUsers } from "@/lib/api/users";
import { PRIORITY_ORDER, STATUS_ORDER } from "@/lib/tickets/labels";
import type { PriorityCount, StatusCount } from "./types";

const KPI_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED"];

/**
 * Totais de todos os chamados por status (os 5). Cartões e donut chamam
 * `countTickets` com os mesmos argumentos, e o `cache` do React faz uma
 * única requisição por status na mesma renderização.
 */
export async function getStatusCounts(accessToken: string): Promise<StatusCount[]> {
  const counts = await Promise.all(STATUS_ORDER.map((s) => countTickets(accessToken, s)));
  return STATUS_ORDER.map((status, i) => ({ status, count: counts[i] }));
}

/** Cartões do administrador: os 4 status acompanhados (sem "Fechados"). */
export async function getAdminKpis(accessToken: string): Promise<StatusCount[]> {
  const counts = await getStatusCounts(accessToken);
  return counts.filter((c) => KPI_STATUSES.includes(c.status));
}

/** Totais de todos os chamados por prioridade, da mais urgente para a menos. */
export async function getPriorityCounts(accessToken: string): Promise<PriorityCount[]> {
  const counts = await Promise.all(
    PRIORITY_ORDER.map((priority) => countTickets(accessToken, undefined, priority)),
  );
  return PRIORITY_ORDER.map((priority, i) => ({ priority, count: counts[i] }));
}

export type CategorySummary = { active: number; inactive: number };

/** Ativas/inativas. Sem o campo `active` (não deveria ocorrer para ADMIN), conta como ativa. */
export async function getCategorySummary(accessToken: string): Promise<CategorySummary> {
  const categories = await listCategories(accessToken);
  const inactive = categories.filter((c) => c.active === false).length;
  return { active: categories.length - inactive, inactive };
}

/** Total de usuários cadastrados (lê só o `total`). */
export async function getUserSummary(accessToken: string): Promise<{ total: number }> {
  const page = await listUsers(accessToken, { limit: 1 });
  return { total: page.total };
}
