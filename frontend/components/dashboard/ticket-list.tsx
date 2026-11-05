import Link from "next/link";
import { PriorityChip, StatusChip } from "@/components/tickets/chip";
import type { TicketItem } from "@/lib/dashboard/types";
import { formatDate } from "@/lib/format";

/** Lista compacta de chamados em um painel; cada linha leva ao chamado. */
export function TicketList({
  items,
  show,
}: {
  items: Array<TicketItem & { note?: string }>;
  /** O que exibir no chip e na linha de metadados. */
  show: { chip: "status" | "priority"; customer?: boolean };
}) {
  return (
    <ul className="-my-2 divide-y divide-foreground/10">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/chamados/${item.id}`}
            className="flex min-h-11 flex-col gap-1.5 rounded-lg py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 truncate font-medium">{item.title}</span>
              {show.chip === "status" ? (
                <StatusChip status={item.status} />
              ) : (
                <PriorityChip priority={item.priority} />
              )}
            </span>
            <span className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
              {item.note && <span className="mr-1 font-bold text-foreground">{item.note}</span>}
              <span>{item.category}</span>
              {show.customer && <span>· {item.customer}</span>}
              <span>
                · <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
