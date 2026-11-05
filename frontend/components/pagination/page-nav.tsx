import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatNumber } from "@/lib/format";
import type { Pagination } from "@/lib/tickets/list";
import { cn } from "@/lib/utils";

const control =
  "inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Anterior / "Página X de Y" / Próxima, com links. Oculta quando há uma única
 * página. Server Component: `hrefFor` é uma função e nunca cruza para o
 * cliente, então só pode ser renderizado por Server Components.
 */
export function PageNav({
  page,
  pagination,
  hrefFor,
}: {
  page: number;
  pagination: Pagination;
  hrefFor: (page: number) => string;
}) {
  if (pagination.totalPages <= 1) return null;

  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-2 md:justify-center md:gap-6">
      {pagination.hasPrev ? (
        <Link href={hrefFor(page - 1)} className={cn(control, "text-primary")}>
          <ChevronLeft aria-hidden className="size-4" />
          Anterior
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(control, "text-muted-foreground")}>
          <ChevronLeft aria-hidden className="size-4" />
          Anterior
        </span>
      )}

      <span className="text-sm tabular-nums" aria-current="page">
        Página {formatNumber(page)} de {formatNumber(pagination.totalPages)}
      </span>

      {pagination.hasNext ? (
        <Link href={hrefFor(page + 1)} className={cn(control, "text-primary")}>
          Próxima
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(control, "text-muted-foreground")}>
          Próxima
          <ChevronRight aria-hidden className="size-4" />
        </span>
      )}
    </nav>
  );
}
