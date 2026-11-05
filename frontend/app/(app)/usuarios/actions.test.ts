import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/errors";
import { jwtExpiringIn } from "@/lib/auth/__tests__/helpers";
import { captureRedirect, nextState, resetNextState } from "@/lib/auth/__tests__/next-mocks";
import { changeRoleAction } from "./actions";

const mocks = vi.hoisted(() => ({ changeUserRole: vi.fn(), refresh: vi.fn(), refreshTokens: vi.fn() }));

vi.mock("next/headers", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextNavigationMock);
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("@/lib/api/users", () => ({ changeUserRole: mocks.changeUserRole }));
vi.mock("@/lib/api/auth", () => ({ refresh: mocks.refreshTokens }));

const USER = "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11";
const GENERIC = "Não foi possível conectar ao servidor. Tente novamente em instantes.";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const valid = { userId: USER, role: "SUPPORT" };
let access: string;

beforeEach(() => {
  access = jwtExpiringIn(900);
  resetNextState({ td_access: access, td_refresh: "r1" });
  mocks.changeUserRole.mockReset();
  mocks.refresh.mockReset();
  mocks.refreshTokens.mockReset();
});

describe("changeRoleAction", () => {
  it("muda o papel, relê a página e devolve 'Papel alterado.' com carimbo", async () => {
    mocks.changeUserRole.mockResolvedValue({ id: USER, role: "SUPPORT" });
    const state = await changeRoleAction({}, form(valid));

    expect(mocks.changeUserRole).toHaveBeenCalledWith(access, USER, "SUPPORT");
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(state).toEqual({ notice: "Papel alterado.", at: expect.any(Number) });
  });

  it.each([
    [{ userId: "abc", role: "SUPPORT" }],
    [{ userId: "", role: "ADMIN" }],
    [{ userId: USER, role: "ROOT" }],
    [{ userId: USER, role: "support" }],
  ])("entrada inválida %j → 'Verifique os dados informados.' sem chamar a API", async (input) => {
    const state = await changeRoleAction({}, form(input));
    expect(state).toEqual({ error: "Verifique os dados informados.", at: expect.any(Number) });
    expect(mocks.changeUserRole).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("papel vazio → 'Selecione o novo papel.' sem chamar a API", async () => {
    const state = await changeRoleAction({}, form({ userId: USER, role: "" }));
    expect(state).toEqual({ error: "Selecione o novo papel.", at: expect.any(Number) });
    expect(mocks.changeUserRole).not.toHaveBeenCalled();
  });

  it("404 → relê a lista e fecha com a explicação", async () => {
    mocks.changeUserRole.mockRejectedValue(new ApiError(404, ["Usuário não encontrado"]));
    const state = await changeRoleAction({}, form(valid));
    expect(state).toEqual({
      gone: true,
      error: "Este usuário não foi encontrado. A lista foi atualizada.",
      at: expect.any(Number),
    });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("422 do próprio papel → mensagem pt-BR com ponto final, sem refresh", async () => {
    mocks.changeUserRole.mockRejectedValue(new ApiError(422, ["Não é permitido alterar o próprio papel"]));
    const state = await changeRoleAction({}, form(valid));
    expect(state).toEqual({ error: "Não é permitido alterar o próprio papel.", at: expect.any(Number) });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("outro 422 → 'Não foi possível concluir a ação.'", async () => {
    mocks.changeUserRole.mockRejectedValue(new ApiError(422, ["Some rule"]));
    const state = await changeRoleAction({}, form(valid));
    expect(state.error).toBe("Não foi possível concluir a ação.");
  });

  it("403 → sem permissão", async () => {
    mocks.changeUserRole.mockRejectedValue(new ApiError(403, ["Forbidden resource"]));
    const state = await changeRoleAction({}, form(valid));
    expect(state.error).toBe("Você não tem permissão para esta ação.");
  });

  it("400 da API → 'Verifique os dados informados.'", async () => {
    mocks.changeUserRole.mockRejectedValue(new ApiError(400, ["Validation failed (uuid is expected)"]));
    const state = await changeRoleAction({}, form(valid));
    expect(state.error).toBe("Verifique os dados informados.");
  });

  it.each([[NETWORK_ERROR_STATUS], [500]])("status %i → mensagem genérica", async (status) => {
    mocks.changeUserRole.mockRejectedValue(new ApiError(status));
    const state = await changeRoleAction({}, form(valid));
    expect(state).toEqual({ error: GENERIC, at: expect.any(Number) });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("401 → renova a sessão uma vez e repete a mudança uma vez", async () => {
    const renewed = jwtExpiringIn(900);
    mocks.refreshTokens.mockResolvedValue({ accessToken: renewed, refreshToken: "r2" });
    mocks.changeUserRole.mockRejectedValueOnce(new ApiError(401)).mockResolvedValueOnce({ id: USER });

    const state = await changeRoleAction({}, form(valid));
    expect(state.notice).toBe("Papel alterado.");
    expect(mocks.refreshTokens).toHaveBeenCalledOnce();
    expect(mocks.changeUserRole).toHaveBeenCalledTimes(2);
    expect(mocks.changeUserRole).toHaveBeenLastCalledWith(renewed, USER, "SUPPORT");
    expect(nextState.cookies.values.get("td_refresh")).toBe("r2");
  });

  it("401 e renovação recusada → login com sessão expirada, sem concluir", async () => {
    // Refresh token próprio: o single-flight reaproveita renovações recentes do mesmo token.
    resetNextState({ td_access: access, td_refresh: "r-recusado" });
    mocks.refreshTokens.mockRejectedValue(new ApiError(401));
    mocks.changeUserRole.mockRejectedValue(new ApiError(401));
    expect(await captureRedirect(() => changeRoleAction({}, form(valid)))).toBe("/login?aviso=sessao-expirada");
    expect(mocks.refreshTokens).toHaveBeenCalledWith("r-recusado");
    expect(mocks.changeUserRole).toHaveBeenCalledOnce();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(nextState.cookies.values.has("td_access")).toBe(false);
  });

  it("cada estado devolvido ganha um carimbo novo", async () => {
    mocks.changeUserRole.mockRejectedValue(new ApiError(403));
    const first = await changeRoleAction({}, form(valid));
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = await changeRoleAction(first, form(valid));
    expect(second.at).toBeGreaterThan(first.at!);
  });
});
