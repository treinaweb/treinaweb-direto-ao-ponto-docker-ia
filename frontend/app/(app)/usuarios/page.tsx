import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormAlert } from "@/components/auth/form-alert";
import { PanelError } from "@/components/dashboard/panel-error";
import { PageNav } from "@/components/pagination/page-nav";
import { RoleChangeButton, RoleChangeProvider } from "@/components/users/role-change";
import { UserCount, UserTable, UserTableSkeleton } from "@/components/users/user-table";
import { listUsers } from "@/lib/api/users";
import { getAccessToken, requireRole } from "@/lib/auth/dal";
import { loadPanel } from "@/lib/dashboard/load-panel";
import { getPagination } from "@/lib/tickets/list";
import { NEW_USER_HREF, USERS_HREF, USERS_PAGE_SIZE, buildUsersHref, toUserRow } from "@/lib/users/list";
import { USER_TEXT } from "@/lib/users/messages";
import { getUserNotice } from "@/lib/users/notices";
import { parseUserListQuery } from "@/lib/validation/users";

export const metadata: Metadata = { title: "Usuários" };

export default function Page({ searchParams }: PageProps<"/usuarios">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

/** Título, "Novo usuário" e aviso ficam visíveis enquanto a lista carrega ou falha. */
async function Content({ searchParams }: Pick<PageProps<"/usuarios">, "searchParams">) {
  // Demais papéis recebem "não encontrado" antes de qualquer chamada a
  // /users; por isso o título também fica aqui dentro.
  const user = await requireRole("ADMIN");
  const params = await searchParams;
  const { page } = parseUserListQuery(params);
  // Código fechado: só avisos conhecidos; o texto nunca vem da URL.
  const notice = getUserNotice(params.aviso);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl leading-none font-medium md:text-[2rem]">{USER_TEXT.pageTitle}</h1>
        <Link
          href={NEW_USER_HREF}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold tracking-[0.05em] text-primary-foreground uppercase outline-none active:bg-primary-pressed focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:w-auto"
        >
          <Plus aria-hidden className="size-4" />
          {USER_TEXT.newUser}
        </Link>
      </div>
      {notice ? <FormAlert tone="info">{notice}</FormAlert> : null}
      {/* Sem `gap` aqui: a região de resultado vazia não pode abrir espaço. */}
      <div>
        <RoleChangeProvider>
          {/* `key`: o esqueleto reaparece a cada troca de página. */}
          <Suspense key={buildUsersHref(page)} fallback={<UserTableSkeleton />}>
            <Results page={page} currentUserId={user.id} />
          </Suspense>
        </RoleChangeProvider>
      </div>
    </div>
  );
}

async function Results({ page, currentUserId }: { page: number; currentUserId: string }) {
  const token = await getAccessToken();
  // Página além do total: a API responde 200 com `data: []` e o `total` real.
  const result = await loadPanel(() => listUsers(token, { page, limit: USERS_PAGE_SIZE }));

  if (!result.ok) {
    return (
      <div className="rounded-panel bg-card p-6 text-card-foreground">
        <PanelError message={USER_TEXT.loadError} />
      </div>
    );
  }

  const { total, data } = result.data;
  const pagination = getPagination(total, page, USERS_PAGE_SIZE);

  // O próprio administrador sempre está na lista: vazio só fora do total.
  if (data.length === 0) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-panel bg-card p-6 text-card-foreground md:p-8">
        <h2 className="text-xl leading-none font-medium">{USER_TEXT.outOfRange}</h2>
        <Link
          href={USERS_HREF}
          className="inline-flex min-h-11 w-fit items-center font-medium text-primary underline-offset-4 hover:underline"
        >
          {USER_TEXT.firstPage}
        </Link>
      </section>
    );
  }

  const rows = data.map((u) => toUserRow(u, currentUserId));
  return (
    <div className="grid gap-4">
      <UserCount total={total} />
      <UserTable
        rows={rows}
        actionFor={(row) => <RoleChangeButton id={row.id} name={row.name} role={row.role} />}
      />
      <PageNav page={page} pagination={pagination} hrefFor={buildUsersHref} />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="grid gap-6">
      <div className="h-8 w-56 max-w-full animate-pulse rounded-md bg-muted" />
      <UserTableSkeleton />
    </div>
  );
}
