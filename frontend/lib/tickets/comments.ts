import type { Ticket } from "@/lib/api/types";
import type { Viewer } from "./actions";

/**
 * O que o detalhe mostra no lugar do campo de comentário:
 * - `composer`: o campo (com a opção de nota interna quando `canInternal`);
 * - `blocked`: um texto explicando por que não dá para comentar;
 * - `none`: nada (o usuário nem deveria ver o chamado).
 */
export type CommentAccess =
  | { kind: "composer"; canInternal: boolean }
  | { kind: "blocked"; reason: "closed" | "assume" }
  | { kind: "none" };

type TicketLike = Pick<Ticket, "status" | "customer" | "assignee">;

/**
 * Quem pode comentar, conforme docs/api-reference.md ("Regras de comentários"):
 *
 *                    OPEN / IN_PROGRESS / WAITING_CUSTOMER / RESOLVED   CLOSED
 * CUSTOMER dono      composer (sem nota interna)                         blocked: closed
 * CUSTOMER outro     none                                                none
 * SUPPORT atribuído  composer (com nota interna)                         blocked: closed
 * SUPPORT outro      blocked: assume                                     blocked: closed
 * ADMIN              composer (com nota interna)                         blocked: closed
 */
export function getCommentAccess(ticket: TicketLike, viewer: Viewer): CommentAccess {
  if (viewer.role === "CUSTOMER" && ticket.customer.id !== viewer.id) return { kind: "none" };
  if (ticket.status === "CLOSED") return { kind: "blocked", reason: "closed" };

  switch (viewer.role) {
    case "CUSTOMER":
      return { kind: "composer", canInternal: false };
    case "SUPPORT":
      return ticket.assignee?.id === viewer.id
        ? { kind: "composer", canInternal: true }
        : { kind: "blocked", reason: "assume" };
    case "ADMIN":
      return { kind: "composer", canInternal: true };
  }
}
