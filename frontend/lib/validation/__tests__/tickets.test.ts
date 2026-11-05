import { describe, expect, it } from "vitest";
import {
  TICKET_MESSAGES,
  createTicketSchema,
  parseTicketAction,
  parseTicketListQuery,
} from "@/lib/validation/tickets";

const VALID = {
  title: "Impressora travada",
  description: "A impressora do 2º andar não imprime desde ontem.",
  priority: "HIGH",
  categoryId: "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11",
};

function errorsOf(input: Record<string, unknown>) {
  const result = createTicketSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message]));
}

describe("createTicketSchema", () => {
  it("aceita dados válidos e remove espaços das extremidades", () => {
    const result = createTicketSchema.parse({ ...VALID, title: "  Impressora travada  " });
    expect(result.title).toBe("Impressora travada");
  });

  it.each([
    ["a".repeat(4), false],
    ["a".repeat(5), true],
    ["a".repeat(120), true],
    ["a".repeat(121), false],
  ])("título com %j caracteres válido=%s", (title, ok) => {
    expect(errorsOf({ ...VALID, title }).title).toBe(ok ? undefined : TICKET_MESSAGES.titleLength);
  });

  it("título curto contado depois do trim", () => {
    expect(errorsOf({ ...VALID, title: "  Erro    " }).title).toBe(TICKET_MESSAGES.titleLength);
  });

  it.each([
    ["a".repeat(9), false],
    ["a".repeat(10), true],
    ["a".repeat(5000), true],
    ["a".repeat(5001), false],
  ])("descrição de %#  válida=%s", (description, ok) => {
    expect(errorsOf({ ...VALID, description }).description).toBe(
      ok ? undefined : TICKET_MESSAGES.descriptionLength,
    );
  });

  it("descrição só com espaços", () => {
    expect(errorsOf({ ...VALID, description: "             " }).description).toBe(
      TICKET_MESSAGES.descriptionLength,
    );
  });

  it.each(["", "urgent", "CRITICAL"])("prioridade inválida %j", (priority) => {
    expect(errorsOf({ ...VALID, priority }).priority).toBe(TICKET_MESSAGES.priorityRequired);
  });

  it.each(["", "abc", "123"])("categoria inválida %j", (categoryId) => {
    expect(errorsOf({ ...VALID, categoryId }).categoryId).toBe(TICKET_MESSAGES.categoryRequired);
  });
});

describe("parseTicketListQuery", () => {
  it("aceita status, prioridade e página válidos", () => {
    expect(parseTicketListQuery({ status: "OPEN", priority: "URGENT", page: "3" })).toEqual({
      status: "OPEN",
      priority: "URGENT",
      page: 3,
    });
  });

  it("sem parâmetros abre a página 1 sem filtros", () => {
    expect(parseTicketListQuery({})).toEqual({ status: undefined, priority: undefined, page: 1 });
  });

  it("descarta status desconhecido e mantém a prioridade", () => {
    expect(parseTicketListQuery({ status: "xyz", priority: "LOW" })).toEqual({
      status: undefined,
      priority: "LOW",
      page: 1,
    });
  });

  it("descarta prioridade em minúsculas (enum exato da API)", () => {
    expect(parseTicketListQuery({ priority: "low" }).priority).toBeUndefined();
  });

  it.each(["", "  "])("trata status vazio %j como ausente", (status) => {
    expect(parseTicketListQuery({ status }).status).toBeUndefined();
  });

  it.each(["-1", "0", "abc", "1.5", ""])("página inválida %j vira 1", (page) => {
    expect(parseTicketListQuery({ page }).page).toBe(1);
  });

  it("valores repetidos usam o primeiro", () => {
    expect(
      parseTicketListQuery({ status: ["CLOSED", "OPEN"], page: ["2", "5"] }),
    ).toMatchObject({ status: "CLOSED", page: 2 });
  });

  it("ignora parâmetros desconhecidos, como o aviso", () => {
    expect(parseTicketListQuery({ aviso: "x", status: "RESOLVED" })).toEqual({
      status: "RESOLVED",
      priority: undefined,
      page: 1,
    });
  });
});

describe("parseTicketAction", () => {
  const ticketId = "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11";
  const assigneeId = "9a1f0c39-6b39-4b8a-9d36-2c2a1c0e9d22";

  it("assumir", () => {
    const r = parseTicketAction({ ticketId, intent: "assume", assigneeId: "" });
    expect(r.success && r.data).toEqual({ intent: "assume", ticketId });
  });

  it("atribuir exige assigneeId UUID", () => {
    const ok = parseTicketAction({ ticketId, intent: "assign", assigneeId });
    expect(ok.success && ok.data).toEqual({ intent: "assign", ticketId, assigneeId });
    expect(parseTicketAction({ ticketId, intent: "assign", assigneeId: "" }).success).toBe(false);
    expect(parseTicketAction({ ticketId, intent: "assign", assigneeId: "abc" }).success).toBe(false);
  });

  it.each(["RESOLVED", "WAITING_CUSTOMER", "IN_PROGRESS", "CLOSED"])("status:%s", (to) => {
    const r = parseTicketAction({ ticketId, intent: `status:${to}`, assigneeId: "" });
    expect(r.success && r.data).toEqual({ intent: "status", ticketId, to });
  });

  it.each(["status:OPEN", "status:XYZ", "status", "delete", ""])("intent inválido %j", (intent) => {
    expect(parseTicketAction({ ticketId, intent, assigneeId: "" }).success).toBe(false);
  });

  it("ticketId precisa ser UUID", () => {
    expect(parseTicketAction({ ticketId: "abc", intent: "assume", assigneeId: "" }).success).toBe(false);
  });
});
