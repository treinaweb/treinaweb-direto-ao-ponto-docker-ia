import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAdminKpis,
  getCategorySummary,
  getPriorityCounts,
  getStatusCounts,
  getUserSummary,
} from "@/lib/dashboard/admin";

const api = vi.hoisted(() => ({
  countTickets: vi.fn(),
  listTickets: vi.fn(),
  listCategories: vi.fn(),
  listUsers: vi.fn(),
}));
vi.mock("@/lib/api/tickets", () => ({ countTickets: api.countTickets, listTickets: api.listTickets }));
vi.mock("@/lib/api/categories", () => ({ listCategories: api.listCategories }));
vi.mock("@/lib/api/users", () => ({ listUsers: api.listUsers }));

const totals: Record<string, number> = {
  OPEN: 3, IN_PROGRESS: 2, WAITING_CUSTOMER: 1, RESOLVED: 4, CLOSED: 5,
  URGENT: 1, HIGH: 2, MEDIUM: 3, LOW: 4,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.countTickets.mockImplementation(async (_t: string, s?: string, p?: string) => totals[(s ?? p)!]);
});

describe("painel do administrador", () => {
  it("contagem dos 5 status, na ordem do ciclo de vida", async () => {
    const counts = await getStatusCounts("a1");
    expect(counts.map((c) => [c.status, c.count])).toEqual([
      ["OPEN", 3], ["IN_PROGRESS", 2], ["WAITING_CUSTOMER", 1], ["RESOLVED", 4], ["CLOSED", 5],
    ]);
  });

  it("cartões usam as mesmas chamadas do donut (argumentos idênticos para o cache)", async () => {
    await getStatusCounts("a1");
    const donutCalls = api.countTickets.mock.calls.map((c) => JSON.stringify(c));
    api.countTickets.mockClear();

    const kpis = await getAdminKpis("a1");
    const kpiCalls = api.countTickets.mock.calls.map((c) => JSON.stringify(c));

    expect(kpiCalls).toEqual(donutCalls);
    expect(kpis.map((k) => k.status)).toEqual(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED"]);
  });

  it("contagem por prioridade sem filtro de status", async () => {
    const counts = await getPriorityCounts("a1");
    expect(counts).toEqual([
      { priority: "URGENT", count: 1 },
      { priority: "HIGH", count: 2 },
      { priority: "MEDIUM", count: 3 },
      { priority: "LOW", count: 4 },
    ]);
    expect(api.countTickets).toHaveBeenCalledWith("a1", undefined, "URGENT");
  });

  it("categorias ativas e inativas (sem `active` conta como ativa)", async () => {
    api.listCategories.mockResolvedValue([
      { id: "1", name: "A", active: true },
      { id: "2", name: "B", active: false },
      { id: "3", name: "C" },
    ]);
    await expect(getCategorySummary("a1")).resolves.toEqual({ active: 2, inactive: 1 });
  });

  it("total de usuários com limit=1", async () => {
    api.listUsers.mockResolvedValue({ data: [], page: 1, limit: 1, total: 17 });
    await expect(getUserSummary("a1")).resolves.toEqual({ total: 17 });
    expect(api.listUsers).toHaveBeenCalledWith("a1", { limit: 1 });
  });
});
