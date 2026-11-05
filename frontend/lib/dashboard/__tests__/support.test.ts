import { beforeEach, describe, expect, it, vi } from "vitest";
import { getQueueByPriority, getQueueTickets, getSupportKpis } from "@/lib/dashboard/support";
import { page, ticket } from "./fixtures";

const api = vi.hoisted(() => ({ listTickets: vi.fn(), countTickets: vi.fn() }));
vi.mock("@/lib/api/tickets", () => api);

beforeEach(() => {
  api.listTickets.mockReset();
  api.countTickets.mockReset();
});

describe("painel do atendente", () => {
  it("cartões: fila (OPEN) e os próprios por status", async () => {
    const totals: Record<string, number> = { OPEN: 4, IN_PROGRESS: 2, WAITING_CUSTOMER: 0, RESOLVED: 9 };
    api.countTickets.mockImplementation(async (_t: string, status: string) => totals[status]);

    await expect(getSupportKpis("a1")).resolves.toEqual([
      { status: "OPEN", count: 4 },
      { status: "IN_PROGRESS", count: 2 },
      { status: "WAITING_CUSTOMER", count: 0 },
      { status: "RESOLVED", count: 9 },
    ]);
  });

  it("próximos da fila: OPEN com limite 5", async () => {
    api.listTickets.mockResolvedValue(page([ticket("OPEN", "URGENT")]));
    const items = await getQueueTickets("a1");
    expect(api.listTickets).toHaveBeenCalledWith("a1", { status: "OPEN", limit: 5 });
    expect(items[0]).toMatchObject({ priority: "URGENT", category: "Financeiro", customer: "Ana" });
  });

  it("fila por prioridade: status=OPEN combinado com cada prioridade, da mais urgente", async () => {
    const totals: Record<string, number> = { URGENT: 1, HIGH: 2, MEDIUM: 0, LOW: 3 };
    api.countTickets.mockImplementation(async (_t: string, _s: string, p: string) => totals[p]);

    await expect(getQueueByPriority("a1")).resolves.toEqual([
      { priority: "URGENT", count: 1 },
      { priority: "HIGH", count: 2 },
      { priority: "MEDIUM", count: 0 },
      { priority: "LOW", count: 3 },
    ]);
    expect(api.countTickets).toHaveBeenCalledWith("a1", "OPEN", "URGENT");
  });
});
