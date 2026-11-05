import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/errors";
import { logoutAction } from "@/lib/auth/logout-action";
import { captureRedirect, nextState, resetNextState } from "./next-mocks";

const mocks = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock("next/headers", async () => (await import("./next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("./next-mocks")).nextNavigationMock);
vi.mock("@/lib/api/auth", () => ({ logout: mocks.logout }));

beforeEach(() => {
  resetNextState({ td_access: "a1", td_refresh: "r1" });
  mocks.logout.mockReset();
});

describe("logoutAction", () => {
  it("204 → revoga na API, apaga cookies e vai ao login com aviso", async () => {
    mocks.logout.mockResolvedValue(undefined);
    expect(await captureRedirect(logoutAction)).toBe("/login?aviso=logout");
    expect(mocks.logout).toHaveBeenCalledWith("a1", "r1");
    expect(nextState.cookies.values.size).toBe(0);
  });

  it.each([[401], [500], [NETWORK_ERROR_STATUS]])(
    "API falha com %i → apaga cookies mesmo assim",
    async (status) => {
      mocks.logout.mockRejectedValue(new ApiError(status));
      expect(await captureRedirect(logoutAction)).toBe("/login?aviso=logout");
      expect(nextState.cookies.values.size).toBe(0);
    },
  );

  it("sem sessão completa → não chama a API, só limpa", async () => {
    resetNextState({ td_refresh: "r1" });
    expect(await captureRedirect(logoutAction)).toBe("/login?aviso=logout");
    expect(mocks.logout).not.toHaveBeenCalled();
    expect(nextState.cookies.values.size).toBe(0);
  });
});
