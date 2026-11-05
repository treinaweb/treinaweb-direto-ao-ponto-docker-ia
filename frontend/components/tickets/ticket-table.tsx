import Link from "next/link";
import { PriorityChip, StatusChip } from "@/components/tickets/chip";
import { formatDate } from "@/lib/format";
import type { TicketRow } from "@/lib/tickets/list";
import { cn } from "@/lib/utils";

const NO_ASSIGNEE = "Na fila";

/**
 * Colunas por papel. Abaixo de `md` cada chamado é um card; a partir de `md`
 * vira uma linha em grade. A grade completa só aparece quando cabe (cliente a
 * partir de `lg`, equipe a partir de `xl`); antes disso categoria, cliente e
 * atendente ficam sob o título.
 */
const LAYOUT = {
  customer: {
    grid: "md:grid-cols-[minmax(0,1fr)_10.5rem_6.5rem_6rem] lg:grid-cols-[minmax(0,1fr)_10.5rem_6.5rem_minmax(0,8rem)_6rem]",
    /** Metadados sob o título enquanto a grade é compacta. */
    subline: "hidden md:block lg:hidden",
    /** Células que só viram coluna na grade completa. */
    fullOnly: "md:hidden lg:block",
  },
  staff: {
    grid: "md:grid-cols-[minmax(0,1fr)_10.5rem_6.5rem_6rem] xl:grid-cols-[minmax(0,1fr)_10.5rem_6.5rem_minmax(0,7rem)_minmax(0,7rem)_minmax(0,7rem)_5.5rem]",
    subline: "hidden md:block xl:hidden",
    fullOnly: "md:hidden xl:block",
  },
} as const;

/** Lista de chamados: uma única marcação para card (mobile) e linha (desktop). */
export function TicketTable({ rows, staff }: { rows: TicketRow[]; staff: boolean }) {
  const layout = staff ? LAYOUT.staff : LAYOUT.customer;
  const cell = "min-w-0 truncate";

  return (
    <div className="rounded-panel bg-card text-card-foreground">
      <div
        aria-hidden
        className={cn(
          "hidden gap-x-3 border-b border-fog px-4 py-3 text-xs font-medium text-muted-foreground md:grid dark:border-foreground/10",
          layout.grid,
        )}
      >
        <span>Título</span>
        <span>Status</span>
        <span>Prioridade</span>
        <span className={layout.fullOnly}>Categoria</span>
        {staff && <span className={layout.fullOnly}>Cliente</span>}
        {staff && <span className={layout.fullOnly}>Atendente</span>}
        <span>Aberto em</span>
      </div>

      <ul className="divide-y divide-fog dark:divide-foreground/10">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/chamados/${row.id}`}
              className={cn(
                "flex min-h-11 flex-col gap-2 rounded-lg px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid md:items-center md:gap-x-3 md:gap-y-0",
                layout.grid,
              )}
            >
              <span className="min-w-0">
                <span className="line-clamp-2 font-medium break-words">{row.title}</span>
                <span className={cn("truncate text-xs text-muted-foreground", layout.subline)}>
                  {sublineFor(row, staff)}
                </span>
              </span>

              <span className="flex flex-wrap gap-2 md:contents">
                <span>
                  <StatusChip status={row.status} />
                </span>
                <span>
                  <PriorityChip priority={row.priority} />
                </span>
              </span>

              <span className="flex flex-wrap gap-x-1 text-xs text-muted-foreground md:contents md:text-sm md:text-foreground">
                <span className={cn(cell, layout.fullOnly)}>{row.category}</span>
                {staff && (
                  <span className={cn(cell, layout.fullOnly)}>
                    <Sep />
                    <span className="sr-only">Cliente: </span>
                    {row.customer}
                  </span>
                )}
                {staff && (
                  <span className={cn(cell, layout.fullOnly)}>
                    <Sep />
                    <span className="sr-only">Atendente: </span>
                    {row.assignee ?? NO_ASSIGNEE}
                  </span>
                )}
                <span className="whitespace-nowrap tabular-nums">
                  <Sep />
                  <span className="sr-only">Aberto em </span>
                  <time dateTime={row.createdAt}>{formatDate(row.createdAt)}</time>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Separador " · " dos metadados no card; some na grade. */
function Sep() {
  return (
    <span aria-hidden className="md:hidden">
      ·{" "}
    </span>
  );
}

/** "Categoria · Cliente · Atendente" sob o título, enquanto a grade é compacta. */
function sublineFor(row: TicketRow, staff: boolean) {
  const parts = [row.category];
  if (staff) parts.push(row.customer ?? "", row.assignee ?? NO_ASSIGNEE);
  return parts.filter(Boolean).join(" · ");
}

export function TicketTableSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando chamados"
      className="flex flex-col gap-4 rounded-panel bg-card p-4"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-muted-foreground/20" />
      ))}
    </div>
  );
}
