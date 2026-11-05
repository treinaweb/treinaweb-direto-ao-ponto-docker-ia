import type { Metadata } from "next";
import { Suspense } from "react";
import { FormAlert } from "@/components/auth/form-alert";
import { PanelError } from "@/components/dashboard/panel-error";
import { EmptyList } from "@/components/tickets/empty-list";
import { TicketFilters } from "@/components/tickets/ticket-filters";
import { TicketCount, TicketPagination } from "@/components/tickets/ticket-pagination";
import { TicketTable, TicketTableSkeleton } from "@/components/tickets/ticket-table";
import { listTickets } from "@/lib/api/tickets";
import { getAccessToken, getCurrentUser, type CurrentUser } from "@/lib/auth/dal";
import { loadPanel } from "@/lib/dashboard/load-panel";
import { pageTitleFor } from "@/lib/navigation/config";
import {
  LIST_PAGE_SIZE,
  buildListHref,
  getPagination,
  hasFilters,
  isStaff,
  toTicketRow,
} from "@/lib/tickets/list";
import { getTicketNotice } from "@/lib/tickets/notices";
import { parseTicketListQuery, type TicketListQuery } from "@/lib/validation/tickets";

export const metadata: Metadata = { title: "Chamados" };

export default function Page({ searchParams }: PageProps<"/chamados">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

/** Título e filtros ficam visíveis enquanto a lista carrega ou falha. */
async function Content({ searchParams }: Pick<PageProps<"/chamados">, "searchParams">) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()]);
  const query = parseTicketListQuery(params);
  const filters = { status: query.status, priority: query.priority };
  // Código fechado: só avisos conhecidos; o texto nunca vem da URL.
  const notice = getTicketNotice(params.aviso);

  return (
    <div className="grid gap-6">
      {/* "Meus chamados" para o cliente, "Chamados" para a equipe. */}
      <h1 className="text-2xl leading-none font-medium md:text-[2rem]">
        {pageTitleFor(user.role, "/chamados") ?? "Chamados"}
      </h1>
      {notice ? <FormAlert tone="info">{notice}</FormAlert> : null}
      <TicketFilters filters={filters} showQueue={user.role === "SUPPORT"} />
      {/* `key`: o esqueleto reaparece a cada troca de filtro ou página. */}
      <Suspense key={buildListHref(filters, query.page)} fallback={<TicketTableSkeleton />}>
        <Results query={query} user={user} />
      </Suspense>
    </div>
  );
}

async function Results({ query, user }: { query: TicketListQuery; user: CurrentUser }) {
  const token = await getAccessToken();
  const filters = { status: query.status, priority: query.priority };

  // Página além do total: a API responde 200 com `data: []` e o `total` real.
  const result = await loadPanel(() =>
    listTickets(token, { ...filters, page: query.page, limit: LIST_PAGE_SIZE }),
  );

  if (!result.ok) {
    return (
      <div className="rounded-panel bg-card p-6 text-card-foreground">
        <PanelError message="Não foi possível carregar os chamados." />
      </div>
    );
  }

  const { total, data } = result.data;
  const pagination = getPagination(total, query.page);
  const rows = data.map((ticket) => toTicketRow(ticket, user.role));

  if (rows.length === 0) {
    return (
      <EmptyList
        role={user.role}
        filters={filters}
        filtered={hasFilters(filters)}
        outOfRange={pagination.outOfRange}
      />
    );
  }

  return (
    <div className="grid gap-4">
      <TicketCount total={total} />
      <TicketTable rows={rows} staff={isStaff(user.role)} />
      <TicketPagination filters={filters} page={query.page} pagination={pagination} />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="grid gap-6">
      <div className="h-8 w-56 max-w-full animate-pulse rounded-md bg-muted" />
      <div className="h-11 w-full max-w-md animate-pulse rounded-md bg-muted" />
      <TicketTableSkeleton />
    </div>
  );
}
