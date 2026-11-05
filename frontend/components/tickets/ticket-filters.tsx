"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import type { TicketPriority, TicketStatus } from "@/lib/api/types";
import { PRIORITY_LABELS, PRIORITY_ORDER, STATUS_LABELS, STATUS_ORDER } from "@/lib/tickets/labels";
import { LIST_HREF, buildListHref, hasFilters, type ListFilters } from "@/lib/tickets/list";
import { cn } from "@/lib/utils";

const QUEUE_HREF = buildListHref({ status: "OPEN" });

const selectClass =
  "h-11 w-full rounded-md border border-steel bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-52 dark:border-foreground/30";

const linkClass =
  "inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline";

/**
 * Filtros da lista. Sem JavaScript é um formulário GET comum; com JavaScript
 * cada troca de select navega no cliente para a URL montada por
 * `buildListHref` (sem parâmetros vazios e sempre na página 1).
 */
export function TicketFilters({
  filters,
  showQueue,
}: {
  filters: ListFilters;
  /** Atalho "Fila" (só para o atendente). */
  showQueue: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const queueActive = filters.status === "OPEN" && !filters.priority;

  function navigate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const href = buildListHref({
      status: (data.get("status") || undefined) as TicketStatus | undefined,
      priority: (data.get("priority") || undefined) as TicketPriority | undefined,
    });
    startTransition(() => router.push(href));
  }

  return (
    <form
      ref={formRef}
      action={LIST_HREF}
      method="get"
      onSubmit={navigate}
      aria-label="Filtrar chamados"
      aria-busy={pending}
      className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end"
    >
      {showQueue && (
        <Link
          href={QUEUE_HREF}
          aria-current={queueActive ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
            queueActive
              ? "border-transparent bg-primary-soft text-ink"
              : "border-steel dark:border-foreground/30",
          )}
        >
          Fila
        </Link>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium">
        Status
        <select
          name="status"
          // `key` reinicia o select quando o filtro muda por link (painel, Fila, Limpar).
          key={`s-${filters.status ?? ""}`}
          defaultValue={filters.status ?? ""}
          onChange={() => formRef.current?.requestSubmit()}
          className={selectClass}
        >
          <option value="">Todos os status</option>
          {STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Prioridade
        <select
          name="priority"
          key={`p-${filters.priority ?? ""}`}
          defaultValue={filters.priority ?? ""}
          onChange={() => formRef.current?.requestSubmit()}
          className={selectClass}
        >
          <option value="">Todas as prioridades</option>
          {PRIORITY_ORDER.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-foreground px-4 text-sm font-semibold tracking-[0.05em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Filtrar
      </button>

      {hasFilters(filters) && (
        <Link href={LIST_HREF} className={linkClass}>
          Limpar filtros
        </Link>
      )}
    </form>
  );
}
