import { Plus } from "lucide-react";
import Link from "next/link";
import type { Role } from "@/lib/api/types";
import { LIST_HREF, buildListHref, type ListFilters } from "@/lib/tickets/list";
import { PRIMARY_ACTION } from "@/lib/navigation/config";

const linkClass =
  "inline-flex min-h-11 w-fit items-center font-medium text-primary underline-offset-4 hover:underline";

/**
 * Lista sem chamados. Distingue: página além do total, vazio por causa dos
 * filtros e vazio de verdade (cliente sem chamados / equipe sem chamados).
 */
export function EmptyList({
  role,
  filters,
  filtered,
  outOfRange,
}: {
  role: Role;
  filters: ListFilters;
  filtered: boolean;
  outOfRange: boolean;
}) {
  if (outOfRange) {
    return (
      <Message text="Esta página não tem chamados.">
        <Link href={buildListHref(filters, 1)} className={linkClass}>
          Ir para a primeira página
        </Link>
      </Message>
    );
  }

  if (filtered) {
    return (
      <Message text="Nenhum chamado com esses filtros.">
        <Link href={LIST_HREF} className={linkClass}>
          Limpar filtros
        </Link>
      </Message>
    );
  }

  if (role === "CUSTOMER") {
    return (
      <Message text="Você ainda não abriu chamados.">
        {/* button-ink: o azul fica reservado ao CTA da sidebar e ao item ativo. */}
        <Link
          href={PRIMARY_ACTION.href}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-foreground px-6 text-sm font-semibold tracking-[0.05em] text-background uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Plus aria-hidden className="size-4" />
          {PRIMARY_ACTION.label}
        </Link>
      </Message>
    );
  }

  return <Message text="Nenhum chamado por aqui." />;
}

function Message({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-panel bg-card p-6 text-card-foreground md:p-8">
      <h2 className="text-xl leading-none font-medium">{text}</h2>
      {children}
    </section>
  );
}
