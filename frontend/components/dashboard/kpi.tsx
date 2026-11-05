import Link from "next/link";
import type { TicketStatus } from "@/lib/api/types";
import type { StatusCount } from "@/lib/dashboard/types";
import { formatNumber } from "@/lib/format";
import { PanelError } from "./panel-error";

/** 1 coluna < 640px, 2 a partir de 640px, 4 a partir de 1024px. */
const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6";

/** `card-stat`: fundo primary-soft nos dois temas; leva à lista filtrada. */
export function KpiCard({ label, value, status }: { label: string; value: number; status: TicketStatus }) {
  return (
    <Link
      href={`/chamados?status=${status}`}
      className="flex flex-col gap-2 rounded-panel bg-primary-soft p-6 text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="text-sm leading-[1.5]">{label}</span>
      <span className="text-2xl leading-[1.17] font-medium tabular-nums">{formatNumber(value)}</span>
    </Link>
  );
}

/** Cartões de um papel: `labels` define o rótulo (e a ordem) de cada status. */
export function KpiGrid({
  counts,
  labels,
}: {
  counts: StatusCount[];
  labels: Partial<Record<TicketStatus, string>>;
}) {
  return (
    <div className={GRID}>
      {counts
        .filter((c) => labels[c.status])
        .map((c) => (
          <KpiCard key={c.status} status={c.status} label={labels[c.status]!} value={c.count} />
        ))}
    </div>
  );
}

export function KpiGridSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando indicadores" className={GRID}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[104px] animate-pulse rounded-panel bg-primary-soft/60" />
      ))}
    </div>
  );
}

export function KpiGridError() {
  return (
    <div className="rounded-panel bg-card p-6 text-card-foreground">
      <PanelError />
    </div>
  );
}
