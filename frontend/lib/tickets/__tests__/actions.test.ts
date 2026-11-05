import { describe, expect, it } from "vitest";
import type { TicketStatus } from "@/lib/api/types";
import { ACTION_ERRORS, actionCopy, successMessage } from "@/lib/tickets/action-labels";
import {
  AWAITING_CUSTOMER_NOTICE,
  getCustomerNotice,
  getTicketActions,
  type TicketAction,
} from "@/lib/tickets/actions";

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

/** Representação curta para comparar a matriz inteira. */
function names(actions: TicketAction[]) {
  return actions.map((a) =>
    a.kind === "status" ? `status:${a.to}` : a.kind === "assign" ? `assign:${a.mode}` : a.kind,
  );
}

const STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"];

/** Esperado por [viewer][status][assigned?]. Chamados OPEN atribuídos não existem na API, mas são cobertos. */
const MATRIX: Record<string, { viewer: typeof OWNER | typeof ASSIGNEE | typeof ADMIN; expected: Record<TicketStatus, [string[], string[]]> }> = {
  "cliente dono": {
    viewer: OWNER,
    expected: {
      OPEN: [["status:CLOSED"], ["status:CLOSED"]],
      IN_PROGRESS: [[], []],
      WAITING_CUSTOMER: [[], []],
      RESOLVED: [["status:IN_PROGRESS", "status:CLOSED"], ["status:IN_PROGRESS", "status:CLOSED"]],
      CLOSED: [[], []],
    },
  },
  "outro cliente": {
    viewer: OTHER_CUSTOMER,
    expected: {
      OPEN: [[], []],
      IN_PROGRESS: [[], []],
      WAITING_CUSTOMER: [[], []],
      RESOLVED: [[], []],
      CLOSED: [[], []],
    },
  },
  "atendente atribuído": {
    viewer: ASSIGNEE,
    expected: {
      OPEN: [["assume"], []],
      IN_PROGRESS: [[], ["status:RESOLVED", "status:WAITING_CUSTOMER"]],
      WAITING_CUSTOMER: [[], ["status:RESOLVED"]],
      RESOLVED: [[], []],
      CLOSED: [[], []],
    },
  },
  "atendente não atribuído": {
    viewer: OTHER_SUPPORT,
    expected: {
      OPEN: [["assume"], []],
      IN_PROGRESS: [[], []],
      WAITING_CUSTOMER: [[], []],
      RESOLVED: [[], []],
      CLOSED: [[], []],
    },
  },
  administrador: {
    viewer: ADMIN,
    expected: {
      OPEN: [["assign:assign", "status:CLOSED"], ["assign:reassign", "status:CLOSED"]],
      IN_PROGRESS: [
        ["status:RESOLVED", "status:WAITING_CUSTOMER", "assign:assign"],
        ["status:RESOLVED", "status:WAITING_CUSTOMER", "assign:reassign"],
      ],
      WAITING_CUSTOMER: [
        ["status:RESOLVED", "assign:assign"],
        ["status:RESOLVED", "assign:reassign"],
      ],
      RESOLVED: [["status:CLOSED"], ["status:CLOSED"]],
      CLOSED: [[], []],
    },
  },
};

describe("getTicketActions — matriz completa", () => {
  for (const [who, { viewer, expected }] of Object.entries(MATRIX)) {
    for (const status of STATUSES) {
      it(`${who} · ${status} · sem atendente`, () => {
        expect(names(getTicketActions(ticket(status, false), viewer))).toEqual(expected[status][0]);
      });
      it(`${who} · ${status} · com atendente`, () => {
        expect(names(getTicketActions(ticket(status, true), viewer))).toEqual(expected[status][1]);
      });
    }
  }
});

describe("regras transversais", () => {
  const viewers = [OWNER, OTHER_CUSTOMER, ASSIGNEE, OTHER_SUPPORT, ADMIN];

  it("CLOSED nunca tem ações", () => {
    for (const v of viewers) {
      expect(getTicketActions(ticket("CLOSED", true), v)).toEqual([]);
    }
  });

  it("ninguém muda OPEN → IN_PROGRESS pela rota de status", () => {
    for (const v of viewers) {
      for (const assigned of [true, false]) {
        expect(names(getTicketActions(ticket("OPEN", assigned), v))).not.toContain("status:IN_PROGRESS");
      }
    }
  });

  it("ADMIN nunca vê Reabrir nem Assumir", () => {
    for (const s of STATUSES) {
      for (const assigned of [true, false]) {
        const n = names(getTicketActions(ticket(s, assigned), ADMIN));
        expect(n).not.toContain("assume");
        expect(n).not.toContain("status:IN_PROGRESS");
      }
    }
  });
});

describe("getCustomerNotice", () => {
  it("só para o cliente dono em Aguardando cliente", () => {
    expect(getCustomerNotice(ticket("WAITING_CUSTOMER", true), OWNER)).toBe(AWAITING_CUSTOMER_NOTICE);
    expect(getCustomerNotice(ticket("WAITING_CUSTOMER", true), OTHER_CUSTOMER)).toBeNull();
    expect(getCustomerNotice(ticket("WAITING_CUSTOMER", true), ASSIGNEE)).toBeNull();
    expect(getCustomerNotice(ticket("IN_PROGRESS", true), OWNER)).toBeNull();
  });

  it("convida a responder pelos comentários", () => {
    expect(getCustomerNotice(ticket("WAITING_CUSTOMER", true), OWNER)).toBe(
      "O atendimento aguarda sua resposta. Responda pelos comentários abaixo.",
    );
  });
});

describe("rótulos e mensagens", () => {
  it("rótulos pt-BR por ação", () => {
    expect(actionCopy({ kind: "status", to: "IN_PROGRESS" }).label).toBe("Reabrir");
    expect(actionCopy({ kind: "status", to: "CLOSED" })).toMatchObject({ label: "Fechar chamado", tone: "destructive" });
    expect(actionCopy({ kind: "status", to: "WAITING_CUSTOMER" }).label).toBe("Aguardar cliente");
    expect(actionCopy({ kind: "assume" }).label).toBe("Assumir");
    expect(actionCopy({ kind: "assign", mode: "reassign" }).label).toBe("Reatribuir");
  });

  it("mensagens de sucesso do spec", () => {
    expect(successMessage({ kind: "assume" })).toBe("Chamado assumido.");
    expect(successMessage({ kind: "assign", assigneeName: "Bruno" })).toBe("Chamado atribuído a Bruno.");
    expect(successMessage({ kind: "status", to: "WAITING_CUSTOMER" })).toBe("Chamado aguardando o cliente.");
    expect(successMessage({ kind: "status", to: "RESOLVED" })).toBe("Chamado resolvido.");
    expect(successMessage({ kind: "status", to: "IN_PROGRESS" })).toBe("Chamado reaberto.");
    expect(successMessage({ kind: "status", to: "CLOSED" })).toBe("Chamado fechado.");
    expect(ACTION_ERRORS.gone).toBe("Este chamado não está mais disponível para você.");
  });
});
