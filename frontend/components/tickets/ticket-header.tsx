import { PriorityChip, StatusChip } from "@/components/tickets/chip";
import type { TicketPriority, TicketStatus } from "@/lib/api/types";

/** Título do chamado (display-sm) com status e prioridade (texto + cor). */
export function TicketHeader({
  title,
  status,
  priority,
}: {
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
}) {
  return (
    <header className="grid gap-3">
      <h1 className="text-2xl leading-[1.17] font-medium break-words">{title}</h1>
      <div className="flex flex-wrap gap-2">
        <StatusChip status={status} />
        <PriorityChip priority={priority} />
      </div>
    </header>
  );
}
