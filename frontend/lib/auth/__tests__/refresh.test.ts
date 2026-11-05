import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/errors";
import { REUSE_WINDOW_MS, refreshSingleFlight, resetRefreshStore } from "@/lib/auth/refresh";

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));
vi.mock("@/lib/api/auth", () => ({ refresh: refreshMock }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  resetRefreshStore();
  refreshMock.mockReset();
  vi.useFakeTimers();
});

afterEach(() => vi.useRealTimers());

describe("refreshSingleFlight", () => {
  it("5 chamadas concorrentes com o mesmo token → 1 chamada à API", async () => {
    const pending = deferred<{ accessToken: string; refreshToken: string }>();
    refreshMock.mockReturnValue(pending.promise);

    const calls = Array.from({ length: 5 }, () => refreshSingleFlight("r1"));
    pending.resolve({ accessToken: "a2", refreshToken: "r2" });

    const results = await Promise.all(calls);
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(refreshMock).toHaveBeenCalledWith("r1");
    expect(results.every((r) => r.refreshToken === "r2")).toBe(true);
  });

  it("reaproveita o resultado dentro da janela e chama de novo depois dela", async () => {
    refreshMock.mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });

    await refreshSingleFlight("r1");
    vi.advanceTimersByTime(REUSE_WINDOW_MS - 1);
    await refreshSingleFlight("r1");
    expect(refreshMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    await refreshSingleFlight("r1");
    expect(refreshMock).toHaveBeenCalledTimes(2);
  });

  it("tokens diferentes não compartilham a renovação", async () => {
    refreshMock.mockResolvedValue({ accessToken: "a", refreshToken: "r" });
    await Promise.all([refreshSingleFlight("r1"), refreshSingleFlight("outro")]);
    expect(refreshMock).toHaveBeenCalledTimes(2);
  });

  it("401 é propagado a todos e reaproveitado na janela (não reenvia o token)", async () => {
    refreshMock.mockRejectedValue(new ApiError(401, ["Unauthorized"]));

    const results = await Promise.allSettled([
      refreshSingleFlight("r1"),
      refreshSingleFlight("r1"),
    ]);
    expect(results.every((r) => r.status === "rejected")).toBe(true);

    await expect(refreshSingleFlight("r1")).rejects.toMatchObject({ status: 401 });
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("falha de rede libera nova tentativa", async () => {
    refreshMock.mockRejectedValueOnce(new ApiError(NETWORK_ERROR_STATUS));
    refreshMock.mockResolvedValueOnce({ accessToken: "a2", refreshToken: "r2" });

    await expect(refreshSingleFlight("r1")).rejects.toBeInstanceOf(ApiError);
    await expect(refreshSingleFlight("r1")).resolves.toMatchObject({ refreshToken: "r2" });
    expect(refreshMock).toHaveBeenCalledTimes(2);
  });
});
