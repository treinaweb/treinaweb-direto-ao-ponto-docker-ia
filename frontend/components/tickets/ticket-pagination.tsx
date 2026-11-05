import { PageNav } from "@/components/pagination/page-nav";
import { formatNumber } from "@/lib/format";
import { buildListHref, type ListFilters, type Pagination } from "@/lib/tickets/list";

/** "N chamados" encontrados com os filtros atuais. */
export function TicketCount({ total }: { total: number }) {
  return (
    <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
      {formatNumber(total)} {total === 1 ? "chamado" : "chamados"}
    </p>
  );
}

/** Paginação da lista de chamados, mantendo os filtros nos links. */
export function TicketPagination({
  filters,
  page,
  pagination,
}: {
  filters: ListFilters;
  page: number;
  pagination: Pagination;
}) {
  return <PageNav page={page} pagination={pagination} hrefFor={(p) => buildListHref(filters, p)} />;
}
