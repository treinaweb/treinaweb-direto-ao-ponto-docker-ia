import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormAlert } from "@/components/auth/form-alert";
import { PanelError } from "@/components/dashboard/panel-error";
import { AssigneePicker, AssigneePickerSkeleton } from "@/components/tickets/assignee-picker";
import { CommentComposer } from "@/components/tickets/comment-composer";
import { CommentThread, CommentThreadSkeleton } from "@/components/tickets/comment-thread";
import { ReplyShortcut } from "@/components/tickets/reply-shortcut";
import { TicketActions } from "@/components/tickets/ticket-actions";
import { TicketDescription } from "@/components/tickets/ticket-description";
import { TicketHeader } from "@/components/tickets/ticket-header";
import { TicketInfo } from "@/components/tickets/ticket-info";
import { getAccessToken, getCurrentUser } from "@/lib/auth/dal";
import { getCustomerNotice, getTicketActions } from "@/lib/tickets/actions";
import { COMMENT_COPY } from "@/lib/tickets/comment-labels";
import { getCommentAccess } from "@/lib/tickets/comments";
import { loadTicket } from "@/lib/tickets/load-ticket";
import { getTicketNotice } from "@/lib/tickets/notices";
import { parseTicketId } from "@/lib/validation/params";

export const metadata: Metadata = { title: "Chamado" };

export default function Page({ params, searchParams }: PageProps<"/chamados/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({
  params,
  searchParams,
}: Pick<PageProps<"/chamados/[id]">, "params" | "searchParams">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const ticketId = parseTicketId(id);
  if (!ticketId) notFound();

  const [user, token] = await Promise.all([getCurrentUser(), getAccessToken()]);
  const result = await loadTicket(token, ticketId);
  if (!result.ok) {
    return (
      <div className="rounded-panel bg-card p-6 text-card-foreground">
        <PanelError message="Não foi possível carregar o chamado." />
      </div>
    );
  }

  const ticket = result.data;
  // A matriz é calculada no servidor: o cliente recebe só a lista de ações, nunca ids de usuários.
  const actions = getTicketActions(ticket, user);
  const assign = actions.find((action) => action.kind === "assign");
  const notice = getTicketNotice(query.aviso);
  const customerNotice = getCustomerNotice(ticket, user);
  // Também no servidor: o campo de comentário recebe só o tipo de acesso.
  const commentAccess = getCommentAccess(ticket, user);

  return (
    <div className="grid gap-6">
      <TicketHeader title={ticket.title} status={ticket.status} priority={ticket.priority} />
      {notice ? <FormAlert tone="info">{notice}</FormAlert> : null}
      {customerNotice ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <FormAlert tone="warning" className="md:flex-1">
            {customerNotice}
          </FormAlert>
          <ReplyShortcut />
        </div>
      ) : null}

      {/*
        Mobile: ações, informações, descrição e comentários. A partir de lg:
        descrição e comentários à esquerda (8/12) e painel lateral (4/12).
      */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4 lg:col-start-9 lg:row-start-1">
          <TicketActions
            ticketId={ticket.id}
            actions={actions}
            assignSlot={
              assign?.kind === "assign" ? (
                <Suspense fallback={<AssigneePickerSkeleton />}>
                  <AssigneePicker
                    mode={assign.mode}
                    currentAssigneeId={ticket.assignee?.id ?? null}
                  />
                </Suspense>
              ) : undefined
            }
          />
        </div>
        <div className="lg:col-span-4 lg:col-start-9 lg:row-start-2">
          <TicketInfo
            info={{
              category: ticket.category.name,
              customer: ticket.customer.name,
              assignee: ticket.assignee?.name ?? null,
              createdAt: ticket.createdAt,
              updatedAt: ticket.updatedAt,
              closedAt: ticket.closedAt,
            }}
          />
        </div>
        <div className="grid min-w-0 gap-6 lg:col-span-8 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <TicketDescription text={ticket.description} />
          <section
            aria-labelledby="ticket-comments"
            className="grid min-w-0 gap-4 rounded-panel bg-card p-4 text-card-foreground md:p-6"
          >
            <h2 id="ticket-comments" className="text-base leading-[1.38] font-medium">
              {COMMENT_COPY.section}
            </h2>
            {/* Suspense próprio: a conversa não atrasa o chamado e a falha fica isolada aqui. */}
            <Suspense fallback={<CommentThreadSkeleton />}>
              <CommentThread ticketId={ticket.id} />
            </Suspense>
            {/* Fora do Suspense: depende só do chamado e do usuário, já carregados. */}
            <CommentComposer ticketId={ticket.id} access={commentAccess} />
          </section>
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando chamado" className="grid gap-6">
      <div className="h-8 w-72 max-w-full animate-pulse rounded-md bg-muted" />
      <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="h-48 animate-pulse rounded-panel bg-muted lg:col-span-8" />
        <div className="h-48 animate-pulse rounded-panel bg-muted lg:col-span-4" />
      </div>
    </div>
  );
}
