import type { Role, Ticket, TicketStatus } from "@/lib/api/types";

/** Destinos de status que alguém pode pedir pela rota `PATCH /tickets/{id}/status`. */
export type StatusTarget = Extract<TicketStatus, "WAITING_CUSTOMER" | "RESOLVED" | "IN_PROGRESS" | "CLOSED">;

export type TicketAction =
  /** SUPPORT assume um chamado da fila (corpo vazio). */
  | { kind: "assume" }
  /** ADMIN escolhe o atendente; `reassign` quando já há um. */
  | { kind: "assign"; mode: "assign" | "reassign" }
  | { kind: "status"; to: StatusTarget };

export type Viewer = { id: string; role: Role };

type TicketLike = Pick<Ticket, "status" | "customer" | "assignee">;

const status = (to: StatusTarget): TicketAction => ({ kind: "status", to });

/**
 * Ações que a API aceita para este usuário neste chamado, conforme
 * docs/api-reference.md ("Atribuição" e "Transições de status"):
 *
 *                 OPEN               IN_PROGRESS          WAITING_CUSTOMER   RESOLVED            CLOSED
 * CUSTOMER dono   fechar             -                    - (aviso)          reabrir, fechar     -
 * SUPPORT         assumir (na fila)  [atribuído]          [atribuído]        -                   -
 *                                    aguardar, resolver   resolver
 * ADMIN           (re)atribuir,      reatribuir,          reatribuir,        fechar              -
 *                 fechar             aguardar, resolver   resolver
 *
 * `OPEN → IN_PROGRESS` nunca é oferecido: acontece só pela atribuição.
 */
export function getTicketActions(ticket: TicketLike, viewer: Viewer): TicketAction[] {
  const assigned = ticket.assignee !== null;

  switch (viewer.role) {
    case "CUSTOMER": {
      if (ticket.customer.id !== viewer.id) return [];
      if (ticket.status === "OPEN") return [status("CLOSED")];
      if (ticket.status === "RESOLVED") return [status("IN_PROGRESS"), status("CLOSED")];
      return [];
    }

    case "SUPPORT": {
      if (ticket.status === "OPEN") return assigned ? [] : [{ kind: "assume" }];
      if (ticket.assignee?.id !== viewer.id) return [];
      if (ticket.status === "IN_PROGRESS") return [status("RESOLVED"), status("WAITING_CUSTOMER")];
      if (ticket.status === "WAITING_CUSTOMER") return [status("RESOLVED")];
      return [];
    }

    case "ADMIN": {
      const assign: TicketAction = { kind: "assign", mode: assigned ? "reassign" : "assign" };
      switch (ticket.status) {
        case "OPEN":
          return [assign, status("CLOSED")];
        case "IN_PROGRESS":
          return [status("RESOLVED"), status("WAITING_CUSTOMER"), assign];
        case "WAITING_CUSTOMER":
          return [status("RESOLVED"), assign];
        case "RESOLVED":
          return [status("CLOSED")];
        case "CLOSED":
          return [];
      }
    }
  }
}

export const AWAITING_CUSTOMER_NOTICE =
  "O atendimento aguarda sua resposta. Responda pelos comentários abaixo.";

/** Aviso ao cliente dono quando o chamado aguarda a resposta dele. */
export function getCustomerNotice(ticket: TicketLike, viewer: Viewer): string | null {
  return viewer.role === "CUSTOMER" &&
    ticket.customer.id === viewer.id &&
    ticket.status === "WAITING_CUSTOMER"
    ? AWAITING_CUSTOMER_NOTICE
    : null;
}
