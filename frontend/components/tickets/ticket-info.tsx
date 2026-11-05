import { formatDateTime } from "@/lib/format";

export type TicketInfoData = {
  category: string;
  customer: string;
  /** `null` → "Na fila". */
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

/** Metadados do chamado em lista de definição. */
export function TicketInfo({ info }: { info: TicketInfoData }) {
  const rows: Array<[string, React.ReactNode]> = [
    ["Categoria", info.category],
    ["Cliente", info.customer],
    ["Atendente", info.assignee ?? "Na fila"],
    ["Aberto em", <Time key="c" iso={info.createdAt} />],
    ["Atualizado em", <Time key="u" iso={info.updatedAt} />],
  ];
  if (info.closedAt) rows.push(["Fechado em", <Time key="f" iso={info.closedAt} />]);

  return (
    <section aria-label="Informações do chamado" className="rounded-panel bg-card p-4 text-card-foreground md:p-6">
      <dl className="grid gap-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Time({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} className="tabular-nums">
      {formatDateTime(iso)}
    </time>
  );
}
