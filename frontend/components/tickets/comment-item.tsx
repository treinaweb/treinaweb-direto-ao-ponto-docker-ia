import { LockKeyhole } from "lucide-react";
import type { ThreadComment } from "@/lib/api/comments";
import { formatDateTime } from "@/lib/format";
import { COMMENT_COPY } from "@/lib/tickets/comment-labels";
import { cn } from "@/lib/utils";

/**
 * Um comentário da conversa: autor, selo em texto ("Equipe"/"Cliente"), data e
 * texto simples (quebras de linha preservadas, nenhum HTML interpretado). A
 * nota interna tem fundo âmbar, borda à esquerda e o rótulo "Nota interna".
 */
export function CommentItem({ comment }: { comment: ThreadComment }) {
  const internal = comment.isInternal;
  return (
    <li>
      <article
        data-internal={internal || undefined}
        className={cn(
          "grid min-w-0 gap-2 rounded-lg p-3 md:p-4",
          internal
            ? "border-l-4 border-internal-note-border bg-internal-note text-internal-note-foreground"
            : "bg-background text-foreground",
        )}
      >
        <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base leading-[1.38] font-medium break-words wrap-anywhere">{comment.authorName}</span>
          <span
            className={cn(
              "rounded-lg px-2 py-0.5 text-xs leading-[1.3] font-bold",
              comment.authorIsStaff
                ? "bg-primary-soft text-ink"
                : "bg-fog text-ink dark:bg-graphite dark:text-on-ink",
            )}
          >
            {comment.authorIsStaff ? COMMENT_COPY.staffBadge : COMMENT_COPY.customerBadge}
          </span>
          <time
            dateTime={comment.createdAt}
            className={cn(
              "text-xs leading-[1.33]",
              internal ? "text-internal-note-foreground" : "text-muted-foreground",
            )}
          >
            {formatDateTime(comment.createdAt)}
          </time>
          {internal ? (
            <span className="inline-flex items-center gap-1 text-xs leading-[1.3] font-bold text-internal-note-accent">
              <LockKeyhole aria-hidden className="size-3.5" />
              {COMMENT_COPY.internalLabel}
            </span>
          ) : null}
        </header>
        <p className="text-base leading-[1.38] break-words wrap-anywhere whitespace-pre-wrap">{comment.body}</p>
      </article>
    </li>
  );
}
