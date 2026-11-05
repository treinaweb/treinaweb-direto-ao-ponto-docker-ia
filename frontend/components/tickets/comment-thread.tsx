import { PanelError } from "@/components/dashboard/panel-error";
import { COMMENTS_MAX, listTicketComments } from "@/lib/api/comments";
import { getAccessToken } from "@/lib/auth/dal";
import { loadPanel } from "@/lib/dashboard/load-panel";
import { formatNumber } from "@/lib/format";
import { COMMENT_COPY, truncatedNotice } from "@/lib/tickets/comment-labels";
import { CommentItem } from "./comment-item";

/**
 * Conversa do chamado (Server Component em `Suspense` próprio). Lê a conversa
 * inteira no servidor; a falha fica isolada aqui e o restante do chamado
 * continua utilizável. 401 leva ao login (via `loadPanel`).
 */
export async function CommentThread({ ticketId }: { ticketId: string }) {
  // O token é lido aqui, nunca recebido por props.
  const accessToken = await getAccessToken();
  const result = await loadPanel(() => listTicketComments(accessToken, ticketId));

  if (!result.ok) {
    return <PanelError message={COMMENT_COPY.loadError} />;
  }

  const { comments, total, truncated } = result.data;
  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">{COMMENT_COPY.empty}</p>;
  }

  return (
    <div className="grid gap-3">
      {truncated ? (
        <p className="text-sm text-muted-foreground">
          {truncatedNotice(formatNumber(total), formatNumber(COMMENTS_MAX))}
        </p>
      ) : null}
      <ol aria-label="Conversa" className="grid gap-3">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </ol>
    </div>
  );
}

export function CommentThreadSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando comentários" className="grid gap-3">
      <div className="h-20 animate-pulse rounded-lg bg-muted-foreground/20" />
      <div className="h-20 animate-pulse rounded-lg bg-muted-foreground/20" />
    </div>
  );
}
