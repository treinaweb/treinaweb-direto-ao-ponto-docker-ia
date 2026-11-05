import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/errors";
import { loadPanel } from "@/lib/dashboard/load-panel";
import { captureRedirect, NotFoundSignal, RedirectSignal } from "@/lib/auth/__tests__/next-mocks";

vi.mock("next/navigation", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextNavigationMock);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("loadPanel", () => {
  it("sucesso → { ok: true, data }", async () => {
    await expect(loadPanel(async () => 7)).resolves.toEqual({ ok: true, data: 7 });
  });

  it("401 → login com aviso de sessão expirada", async () => {
    const url = await captureRedirect(() =>
      loadPanel(async () => {
        throw new ApiError(401);
      }),
    );
    expect(url).toBe("/login?aviso=sessao-expirada");
  });

  it.each([NETWORK_ERROR_STATUS, 500, 503, 403, 400])("status %s → { ok: false }", async (status) => {
    await expect(
      loadPanel(async () => {
        throw new ApiError(status);
      }),
    ).resolves.toEqual({ ok: false });
  });

  it("erro inesperado → { ok: false }", async () => {
    await expect(
      loadPanel(async () => {
        throw new TypeError("bug");
      }),
    ).resolves.toEqual({ ok: false });
  });

  it("sinais internos do Next são relançados", async () => {
    await expect(
      loadPanel(async () => {
        throw new RedirectSignal("/login");
      }),
    ).rejects.toBeInstanceOf(RedirectSignal);
    await expect(
      loadPanel(async () => {
        throw new NotFoundSignal();
      }),
    ).rejects.toBeInstanceOf(NotFoundSignal);
  });
});
