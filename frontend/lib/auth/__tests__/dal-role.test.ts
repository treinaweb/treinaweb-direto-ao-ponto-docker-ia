import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, requireRole } from "@/lib/auth/dal";
import {
  captureRedirect,
  nextNavigationMock,
  NotFoundSignal,
  resetNextState,
} from "./next-mocks";

const mocks = vi.hoisted(() => ({ getMe: vi.fn() }));

vi.mock("next/headers", async () => (await import("./next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("./next-mocks")).nextNavigationMock);
vi.mock("@/lib/api/users", () => ({ getMe: mocks.getMe }));

const me = (role: string) => ({
  id: "u1",
  name: "Ana",
  email: "ana@teste.com",
  role,
  createdAt: "2026-01-01T00:00:00Z",
});

beforeEach(() => {
  resetNextState({ td_access: "a1", td_refresh: "r1" });
  mocks.getMe.mockReset();
  nextNavigationMock.notFound.mockClear();
});

describe("requireRole", () => {
  it("papel permitido devolve o usuário", async () => {
    mocks.getMe.mockResolvedValue(me("ADMIN"));
    await expect(requireRole("ADMIN")).resolves.toEqual({ id: "u1", name: "Ana", role: "ADMIN" });
    expect(nextNavigationMock.notFound).not.toHaveBeenCalled();
  });

  it("aceita qualquer um dos papéis informados", async () => {
    mocks.getMe.mockResolvedValue(me("SUPPORT"));
    await expect(requireRole("SUPPORT", "ADMIN")).resolves.toMatchObject({ role: "SUPPORT" });
  });

  it("papel sem acesso → notFound", async () => {
    mocks.getMe.mockResolvedValue(me("CUSTOMER"));
    await expect(requireRole("ADMIN")).rejects.toBeInstanceOf(NotFoundSignal);
    expect(nextNavigationMock.notFound).toHaveBeenCalledTimes(1);
  });

  it("sem sessão → login, sem notFound", async () => {
    resetNextState();
    expect(await captureRedirect(() => requireRole("ADMIN"))).toBe("/login?aviso=sessao-expirada");
    expect(mocks.getMe).not.toHaveBeenCalled();
    expect(nextNavigationMock.notFound).not.toHaveBeenCalled();
  });
});

describe("getAccessToken", () => {
  it("devolve o token do cookie", async () => {
    await expect(getAccessToken()).resolves.toBe("a1");
  });

  it("sem cookie → login com aviso", async () => {
    resetNextState({ td_refresh: "r1" });
    expect(await captureRedirect(getAccessToken)).toBe("/login?aviso=sessao-expirada");
  });
});
