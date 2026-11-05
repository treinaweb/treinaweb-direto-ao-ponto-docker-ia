import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAttentionTickets,
  getCustomerKpis,
  getRecentTickets,
} from "@/lib/dashboard/customer";
import { page, ticket } from "./fixtures";

const api = vi.hoisted(() => ({ listTickets: vi.fn(), countTickets: vi.fn() }));
vi.mock("@/lib/api/tickets", () => api);

beforeEach(() => {
  api.listTickets.mockReset();
  api.countTickets.mockReset();
});

describe("getCustomerKpis", () => {
  it("conta os quatro status do cliente com o token da sessão", async () => {
    const totals: Record<string, number> = { OPEN: 2, IN_PROGRESS: 1, WAITING_CUSTOMER: 1, RESOLVED: 3 };
    api.countTickets.mockImplementation(async (_t: string, status: string) => totals[status]);

    await expect(getCustomerKpis("a1")).resolves.toEqual([
      { status: "OPEN", count: 2 },
      { status: "IN_PROGRESS", count: 1 },
      { status: "WAITING_CUSTOMER", count: 1 },
      { status: "RESOLVED", count: 3 },
    ]);
    expect(api.countTickets).toHaveBeenCalledWith("a1", "OPEN");
  });
});

describe("getAttentionTickets", () => {
  it("aguardando resposta antes de resolvidos, no máximo 5", async () => {
    const waiting = [ticket("WAITING_CUSTOMER"), ticket("WAITING_CUSTOMER")];
    const resolved = [1, 2, 3, 4].map(() => ticket("RESOLVED"));
    api.listTickets.mockImplementation(async (_t: string, f: { status: string }) =>
      page(f.status === "WAITING_CUSTOMER" ? waiting : resolved),
    );

    const items = await getAttentionTickets("a1");
    expect(items).toHaveLength(5);
    expect(items.map((i) => i.action)).toEqual(["reply", "reply", "confirm", "confirm", "confirm"]);
    expect(api.listTickets).toHaveBeenCalledWith("a1", { status: "WAITING_CUSTOMER", limit: 5 });
    expect(api.listTickets).toHaveBeenCalledWith("a1", { status: "RESOLVED", limit: 5 });
  });

  it("nada pendente → lista vazia", async () => {
    api.listTickets.mockResolvedValue(page([]));
    await expect(getAttentionTickets("a1")).resolves.toEqual([]);
  });
});

describe("getRecentTickets", () => {
  it("5 mais recentes como DTO enxuto", async () => {
    const t = ticket("OPEN", "HIGH");
    api.listTickets.mockResolvedValue(page([t]));

    const [item] = await getRecentTickets("a1");
    expect(api.listTickets).toHaveBeenCalledWith("a1", { limit: 5 });
    expect(item).toEqual({
      id: t.id,
      title: t.title,
      status: "OPEN",
      priority: "HIGH",
      category: "Financeiro",
      customer: "Ana",
      createdAt: t.createdAt,
    });
    expect(item).not.toHaveProperty("description");
  });
});
