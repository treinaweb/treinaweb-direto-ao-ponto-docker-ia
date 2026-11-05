import { ROLE_LABELS } from "@/lib/auth/roles";
import { formatDate, formatNumber } from "@/lib/format";
import type { UserRow } from "@/lib/users/list";
import { cn } from "@/lib/utils";

/** Nome | E-mail | Papel | Cadastrado em | ação, a partir de `md`. */
const GRID =
  "md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_6.25rem_5.5rem_8.5rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_7.5rem_6.5rem_9.5rem]";

/** "N usuários" no total (todas as páginas). */
export function UserCount({ total }: { total: number }) {
  return (
    <p className="text-sm text-muted-foreground tabular-nums">
      {formatNumber(total)} {total === 1 ? "usuário" : "usuários"}
    </p>
  );
}

/**
 * Lista de usuários: uma única marcação para card (abaixo de `md`) e linha em
 * grade (a partir de `md`, sob um cabeçalho `aria-hidden`). Nenhuma linha é
 * link (não há detalhe de usuário): a única ação é a de `actionFor`, ausente na
 * linha do próprio administrador, que mostra "Você".
 */
export function UserTable({
  rows,
  actionFor,
}: {
  rows: UserRow[];
  /** Ação da linha (botão "Mudar papel"); não é chamada para a linha própria. */
  actionFor?: (row: UserRow) => React.ReactNode;
}) {
  return (
    <div className="rounded-panel bg-card text-card-foreground">
      <div
        aria-hidden
        className={cn(
          "hidden gap-x-3 border-b border-fog px-4 py-3 text-xs font-medium text-muted-foreground md:grid dark:border-foreground/10",
          GRID,
        )}
      >
        <span>Nome</span>
        <span>E-mail</span>
        <span>Papel</span>
        <span>Cadastrado em</span>
        <span />
      </div>

      <ul aria-label="Usuários" className="divide-y divide-fog dark:divide-foreground/10">
        {rows.map((row) => (
          <li
            key={row.id}
            data-slot="user-row"
            className={cn("flex flex-col gap-1.5 px-4 py-3 md:grid md:items-center md:gap-x-3 md:gap-y-0", GRID)}
          >
            {/* Card: quebra em qualquer ponto; grade: uma linha com reticências e o nome completo no title. */}
            <span title={row.name} className="min-w-0 font-medium break-words wrap-anywhere md:truncate md:wrap-normal">
              {row.name}
            </span>

            <span
              title={row.email}
              className="min-w-0 text-sm break-all text-muted-foreground md:truncate md:break-normal md:text-foreground"
            >
              {row.email}
            </span>

            <span className="flex flex-wrap gap-x-1 text-sm text-muted-foreground md:contents md:text-foreground">
              <span className="min-w-0 md:truncate">
                <span className="sr-only">Papel: </span>
                {ROLE_LABELS[row.role]}
              </span>
              <span className="whitespace-nowrap tabular-nums">
                <span aria-hidden className="md:hidden">
                  ·{" "}
                </span>
                <span className="md:sr-only">Cadastrado em </span>
                <time dateTime={row.createdAt}>{formatDate(row.createdAt)}</time>
              </span>
            </span>

            <span className="mt-1.5 flex md:mt-0 md:justify-end">
              {row.isSelf ? (
                <span className="inline-flex min-h-11 items-center text-sm font-medium">Você</span>
              ) : (
                actionFor?.(row)
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UserTableSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando usuários"
      className="flex flex-col gap-4 rounded-panel bg-card p-4"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-11 animate-pulse rounded-md bg-muted-foreground/20" />
      ))}
    </div>
  );
}
