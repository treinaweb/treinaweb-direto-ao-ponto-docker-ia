import { describe, expect, it } from "vitest";
import { ticket } from "@/lib/dashboard/__tests__/fixtures";
import { buildListHref, getPagination, hasFilters, toTicketRow } from "@/lib/tickets/list";

describe("buildListHref", () => {
  it("sem filtros e na página 1 é /chamados", () => {
    expect(buildListHref({})).toBe("/chamados");
    expect(buildListHref({}, 1)).toBe("/chamados");
  });

  it("preserva os filtros e omite page=1", () => {
    expect(buildListHref({ status: "OPEN", priority: "HIGH" }, 1)).toBe(
      "/chamados?status=OPEN&priority=HIGH",
    );
  });

  it("inclui a página a partir da 2", () => {
    expect(buildListHref({ status: "OPEN" }, 2)).toBe("/chamados?status=OPEN&page=2");
    expect(buildListHref({}, 3)).toBe("/chamados?page=3");
  });
});

describe("hasFilters", () => {
  it("indica filtro ativo", () => {
    expect(hasFilters({})).toBe(false);
    expect(hasFilters({ priority: "LOW" })).toBe(true);
  });
});

describe("getPagination", () => {
  it("primeira de três páginas", () => {
    expect(getPagination(42, 1, 20)).toEqual({
      totalPages: 3,
      hasPrev: false,
      hasNext: true,
      outOfRange: false,
    });
  });

  it("última página", () => {
    expect(getPagination(42, 3, 20)).toMatchObject({ hasPrev: true, hasNext: false });
  });

  it("página única", () => {
    expect(getPagination(20, 1, 20)).toEqual({
      totalPages: 1,
      hasPrev: false,
      hasNext: false,
      outOfRange: false,
    });
  });

  it("lista vazia não é página fora do intervalo", () => {
    expect(getPagination(0, 1, 20)).toMatchObject({ totalPages: 1, outOfRange: false });
    expect(getPagination(0, 4, 20).outOfRange).toBe(false);
  });

  it("página além do total", () => {
    expect(getPagination(5, 9, 20)).toMatchObject({
      outOfRange: true,
      hasPrev: false,
      hasNext: false,
    });
  });
});

describe("toTicketRow", () => {
  const sample = {
    ...ticket("IN_PROGRESS", "HIGH"),
    assignee: { id: "s1", name: "Bruno", role: "SUPPORT" as const },
  };

  it("cliente não recebe cliente nem atendente", () => {
    const row = toTicketRow(sample, "CUSTOMER");
    expect(row).not.toHaveProperty("customer");
    expect(row).not.toHaveProperty("assignee");
    expect(row).toMatchObject({ status: "IN_PROGRESS", priority: "HIGH", category: "Financeiro" });
  });

  it("equipe recebe nomes de cliente e atendente", () => {
    expect(toTicketRow(sample, "ADMIN")).toMatchObject({ customer: "Ana", assignee: "Bruno" });
  });

  it("chamado sem atendente vira assignee null (Na fila)", () => {
    expect(toTicketRow(ticket("OPEN"), "SUPPORT").assignee).toBeNull();
  });

  it("nunca inclui descrição, e-mails ou ids de usuários", () => {
    const json = JSON.stringify(toTicketRow(sample, "ADMIN"));
    expect(json).not.toContain("descrição");
    expect(json).not.toContain("email");
    expect(json).not.toContain('"s1"');
    expect(json).not.toContain('"u1"');
  });
});
