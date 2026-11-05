"use client";

import { COMMENT_COPY, COMMENT_FIELD_ID } from "@/lib/tickets/comment-labels";

/**
 * Atalho "Responder" do aviso de "Aguardando cliente": rola até o campo de
 * comentário e coloca o foco nele (um link `#field-body` sozinho não garante o foco).
 */
export function ReplyShortcut() {
  return (
    <button
      type="button"
      onClick={() => {
        const field = document.getElementById(COMMENT_FIELD_ID);
        if (!field) return;
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        field.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        field.focus({ preventScroll: true });
      }}
      className="inline-flex min-h-11 items-center justify-center rounded-md border border-foreground px-4 text-sm font-semibold tracking-[0.05em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {COMMENT_COPY.reply}
    </button>
  );
}
