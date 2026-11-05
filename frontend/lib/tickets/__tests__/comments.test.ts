import { describe, expect, it } from "vitest";
import type { TicketStatus } from "@/lib/api/types";
import {
  COMMENT_ERRORS,
  commentSuccess,
  submitCopy,
  truncatedNotice,
  unprocessableMessage,
} from "@/lib/tickets/comment-labels";
import { getCommentAccess, type CommentAccess } from "@/lib/tickets/comments";

const OWNER = { id: "c1", role: "CUSTOMER" as const };
const OTHER_CUSTOMER = { id: "c2", role: "CUSTOMER" as const };
const ASSIGNEE = { id: "s1", role: "SUPPORT" as const };
const OTHER_SUPPORT = { id: "s2", role: "SUPPORT" as const };
const ADMIN = { id: "a1", role: "ADMIN" as const };

function ticket(status: TicketStatus, assigned: boolean) {
  return {
    status,
    customer: { id: "c1", name: "Ana", role: "CUSTOMER" as const },
    assignee: assigned ? { id: "s1", name: "Bruno", role: "SUPPORT" as const } : null,
  };
}

const STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"];

const customerComposer: CommentAccess = { kind: "composer", canInternal: false };
const staffComposer: CommentAccess = { kind: "composer", canInternal: true };
const closed: CommentAccess = { kind: "blocked", reason: "closed" };
const assume: CommentAccess = { kind: "blocked", reason: "assume" };
const none: CommentAccess = { kind: "none" };

/** Esperado por [quem][status] → [sem atendente, com atendente (s1)]. */
const MATRIX: Array<[string, typeof OWNER | typeof ASSIGNEE | typeof ADMIN, (s: TicketStatus) => [CommentAccess, CommentAccess]]> = [
  ["cliente dono", OWNER, (s) => (s === "CLOSED" ? [closed, closed] : [customerComposer, customerComposer])],
  ["outro cliente", OTHER_CUSTOMER, () => [none, none]],
  ["atendente atribuído", ASSIGNEE, (s) => (s === "CLOSED" ? [closed, closed] : [assume, staffComposer])],
  ["atendente não atribuído", OTHER_SUPPORT, (s) => (s === "CLOSED" ? [closed, closed] : [assume, assume])],
  ["administrador", ADMIN, (s) => (s === "CLOSED" ? [closed, closed] : [staffComposer, staffComposer])],
];

describe("getCommentAccess — papel × relação × status", () => {
  for (const [who, viewer, expected] of MATRIX) {
    for (const status of STATUSES) {
      it(`${who} · ${status} · sem atendente`, () => {
        expect(getCommentAccess(ticket(status, false), viewer)).toEqual(expected(status)[0]);
      });
      it(`${who} · ${status} · com atendente`, () => {
        expect(getCommentAccess(ticket(status, true), viewer)).toEqual(expected(status)[1]);
      });
    }
  }
});

describe("regras transversais", () => {
  const viewers = [OWNER, ASSIGNEE, OTHER_SUPPORT, ADMIN];

  it("CLOSED bloqueia todos que veem o chamado", () => {
    for (const v of viewers) {
      for (const assigned of [true, false]) {
        expect(getCommentAccess(ticket("CLOSED", assigned), v)).toEqual(closed);
      }
    }
  });

  it("nota interna só para SUPPORT e ADMIN", () => {
    for (const status of STATUSES) {
      for (const assigned of [true, false]) {
        const access = getCommentAccess(ticket(status, assigned), OWNER);
        if (access.kind === "composer") expect(access.canInternal).toBe(false);
      }
    }
    expect(getCommentAccess(ticket("IN_PROGRESS", true), ASSIGNEE)).toEqual(staffComposer);
    expect(getCommentAccess(ticket("OPEN", false), ADMIN)).toEqual(staffComposer);
  });
});

describe("textos dos comentários", () => {
  it("botão e mensagem seguem a opção de nota interna", () => {
    expect(submitCopy(false)).toMatchObject({ label: "Enviar resposta", pending: "Enviando..." });
    expect(submitCopy(true)).toMatchObject({ label: "Adicionar nota interna", pending: "Adicionando..." });
    expect(commentSuccess(false)).toBe("Resposta enviada.");
    expect(commentSuccess(true)).toBe("Nota interna adicionada.");
  });

  it("aviso de teto", () => {
    expect(truncatedNotice("2.150", "2.000")).toBe(
      "Esta conversa tem 2.150 comentários. Exibindo os 2.000 mais recentes.",
    );
  });

  it.each([
    [["Ticket fechado não aceita comentários"], COMMENT_ERRORS.closed],
    [["Apenas o atendente atribuído pode comentar neste ticket"], COMMENT_ERRORS.notAssignee],
    [["Something else"], COMMENT_ERRORS.notAllowed],
    [[], COMMENT_ERRORS.notAllowed],
  ])("422 %j → mensagem pt-BR do frontend", (messages, expected) => {
    expect(unprocessableMessage(messages)).toBe(expected);
  });
});
