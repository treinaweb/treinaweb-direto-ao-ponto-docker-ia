import type { TicketPriority, TicketStatus } from "@/lib/api/types";
import { PRIORITY_TONES, STATUS_TONES } from "@/lib/tickets/colors";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/tickets/labels";
import { cn } from "@/lib/utils";

/** Chip com ponto colorido + texto (nunca só cor). */
export function Chip({ label, chip, dot }: { label: string; chip: string; dot: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-0.5 text-sm leading-[1.3] font-bold whitespace-nowrap",
        chip,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}

export function StatusChip({ status }: { status: TicketStatus }) {
  return <Chip label={STATUS_LABELS[status]} {...STATUS_TONES[status]} />;
}

export function PriorityChip({ priority }: { priority: TicketPriority }) {
  return <Chip label={PRIORITY_LABELS[priority]} {...PRIORITY_TONES[priority]} />;
}
