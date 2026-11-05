import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/errors";
import { NotFoundSignal, captureRedirect } from "@/lib/auth/__tests__/next-mocks";
import { loadTicket } from "@/lib/tickets/load-ticket";

const mocks = vi.hoisted(() => ({ getTicket: vi.fn() }));

vi.mock("next/navigation", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextNavigationMock);
vi.mock("@/lib/api/tickets", () => ({ getTicket: mocks.getTicket }));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.getTicket.mockReset();
});

describe("loadTicket", () => {
  it("sucesso → { ok: true, data }", async () => {
    mocks.getTicket.mockResolvedValue({ id: "t1" });
    await expect(loadTicket("a1", "t1")).resolves.toEqual({ ok: true, data: { id: "t1" } });
    expect(mocks.getTicket).toHaveBeenCalledWith("a1", "t1");
  });

  it.each([404, 400])("%s → não encontrado", async (status) => {
    mocks.getTicket.mockRejectedValue(new ApiError(status));
    await expect(loadTicket("a1", "t1")).rejects.toBeInstanceOf(NotFoundSignal);
  });

  it("401 → login com sessão expirada", async () => {
    mocks.getTicket.mockRejectedValue(new ApiError(401));
    expect(await captureRedirect(() => loadTicket("a1", "t1"))).toBe("/login?aviso=sessao-expirada");
  });

  it.each([NETWORK_ERROR_STATUS, 500, 403])("%s → { ok: false }", async (status) => {
    mocks.getTicket.mockRejectedValue(new ApiError(status));
    await expect(loadTicket("a1", "t1")).resolves.toEqual({ ok: false });
  });
});
