import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/dal";
import { withSession } from "@/lib/auth/session-action";
import {
  captureRedirect,
  nextHeadersMock,
  nextNavigationMock,
  nextState,
  resetNextState,
} from "./next-mocks";

const mocks = vi.hoisted(() => ({ getMe: vi.fn(), refreshSingleFlight: vi.fn() }));

vi.mock("next/headers", async () => (await import("./next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("./next-mocks")).nextNavigationMock);
vi.mock("@/lib/api/users", () => ({ getMe: mocks.getMe }));
vi.mock("@/lib/auth/refresh", () => ({ refreshSingleFlight: mocks.refreshSingleFlight }));

const user = {
  id: "u1",
  name: "Ana",
  email: "ana@teste.com",
  role: "CUSTOMER",
  createdAt: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  resetNextState();
  mocks.getMe.mockReset();
  mocks.refreshSingleFlight.mockReset();
  nextHeadersMock.cookies.mockClear();
  nextNavigationMock.redirect.mockClear();
});

describe("getCurrentUser (Server Components)", () => {
  it("retorna só nome e papel", async () => {
    resetNextState({ td_access: "a1", td_refresh: "r1" });
    mocks.getMe.mockResolvedValue(user);

    await expect(getCurrentUser()).resolves.toEqual({ id: "u1", name: "Ana", role: "CUSTOMER" });
    expect(mocks.getMe).toHaveBeenCalledWith("a1");
  });

  it("sem cookie → login, sem chamar a API", async () => {
    expect(await captureRedirect(getCurrentUser)).toBe("/login?aviso=sessao-expirada");
    expect(mocks.getMe).not.toHaveBeenCalled();
  });

  it("401 → login e nunca renova tokens", async () => {
    resetNextState({ td_access: "a1", td_refresh: "r1" });
    mocks.getMe.mockRejectedValue(new ApiError(401));

    expect(await captureRedirect(getCurrentUser)).toBe("/login?aviso=sessao-expirada");
    expect(mocks.refreshSingleFlight).not.toHaveBeenCalled();
    expect(nextState.cookies.sets).toEqual([]);
  });

  it("outros erros sobem para o error boundary", async () => {
    resetNextState({ td_access: "a1" });
    mocks.getMe.mockRejectedValue(new ApiError(503));
    await expect(getCurrentUser()).rejects.toMatchObject({ status: 503 });
  });
});

describe("withSession (Server Actions)", () => {
  it("sem sessão → login sem chamar a API", async () => {
    const call = vi.fn();
    expect(await captureRedirect(() => withSession(call))).toBe("/login");
    expect(call).not.toHaveBeenCalled();
  });

  it("chamada bem-sucedida não renova", async () => {
    resetNextState({ td_access: "a1", td_refresh: "r1" });
    await expect(withSession(async (token) => `ok:${token}`)).resolves.toBe("ok:a1");
    expect(mocks.refreshSingleFlight).not.toHaveBeenCalled();
  });

  it("401 → renova uma vez, grava cookies e repete uma vez", async () => {
    resetNextState({ td_access: "a1", td_refresh: "r1" });
    mocks.refreshSingleFlight.mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });
    const call = vi.fn(async (token: string) => {
      if (token === "a1") throw new ApiError(401);
      return `ok:${token}`;
    });

    await expect(withSession(call)).resolves.toBe("ok:a2");
    expect(call).toHaveBeenCalledTimes(2);
    expect(mocks.refreshSingleFlight).toHaveBeenCalledTimes(1);
    expect(mocks.refreshSingleFlight).toHaveBeenCalledWith("r1");
    expect(nextState.cookies.values.get("td_access")).toBe("a2");
    expect(nextState.cookies.values.get("td_refresh")).toBe("r2");
  });

  it("sem access mas com refresh → renova antes de chamar", async () => {
    resetNextState({ td_refresh: "r1" });
    mocks.refreshSingleFlight.mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });
    const call = vi.fn(async (token: string) => token);
    await expect(withSession(call)).resolves.toBe("a2");
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("renovação 401 → apaga cookies e vai ao login com aviso", async () => {
    resetNextState({ td_access: "a1", td_refresh: "r1" });
    mocks.refreshSingleFlight.mockRejectedValue(new ApiError(401));
    const call = vi.fn(async () => {
      throw new ApiError(401);
    });

    expect(await captureRedirect(() => withSession(call))).toBe("/login?aviso=sessao-expirada");
    expect(call).toHaveBeenCalledTimes(1);
    expect(nextState.cookies.values.size).toBe(0);
  });

  it("401 de novo após renovar → não tenta pela terceira vez", async () => {
    resetNextState({ td_access: "a1", td_refresh: "r1" });
    mocks.refreshSingleFlight.mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });
    const call = vi.fn(async () => {
      throw new ApiError(401);
    });

    expect(await captureRedirect(() => withSession(call))).toBe("/login?aviso=sessao-expirada");
    expect(call).toHaveBeenCalledTimes(2);
    expect(mocks.refreshSingleFlight).toHaveBeenCalledTimes(1);
  });

  it("erros que não são 401 são propagados", async () => {
    resetNextState({ td_access: "a1" });
    await expect(
      withSession(async () => {
        throw new ApiError(422);
      }),
    ).rejects.toMatchObject({ status: 422 });
  });
});
