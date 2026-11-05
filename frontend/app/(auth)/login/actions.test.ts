import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/errors";
import {
  captureRedirect,
  nextState,
  resetNextState,
} from "@/lib/auth/__tests__/next-mocks";
import { jwtExpiringIn } from "@/lib/auth/__tests__/helpers";
import { loginAction } from "./actions";

const mocks = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock("next/headers", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextNavigationMock);
vi.mock("@/lib/api/auth", () => ({ login: mocks.login }));

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const valid = { email: "ana@teste.com", password: "senhaSegura123" };

beforeEach(() => {
  resetNextState();
  mocks.login.mockReset();
});

describe("loginAction", () => {
  it("sucesso → grava cookies e vai ao /dashboard", async () => {
    const tokens = { accessToken: jwtExpiringIn(900), refreshToken: "r1" };
    mocks.login.mockResolvedValue(tokens);

    const url = await captureRedirect(() => loginAction({}, form(valid)));

    expect(url).toBe("/dashboard");
    expect(mocks.login).toHaveBeenCalledWith(valid);
    expect(nextState.cookies.values.get("td_access")).toBe(tokens.accessToken);
    expect(nextState.cookies.values.get("td_refresh")).toBe("r1");
  });

  it("respeita next interno e ignora externo", async () => {
    mocks.login.mockResolvedValue({ accessToken: "a", refreshToken: "r" });
    expect(
      await captureRedirect(() => loginAction({}, form({ ...valid, next: "/dashboard?x=1" }))),
    ).toBe("/dashboard?x=1");
    expect(
      await captureRedirect(() => loginAction({}, form({ ...valid, next: "https://exemplo.com" }))),
    ).toBe("/dashboard");
  });

  it("validação falha → erros por campo sem chamar a API", async () => {
    const state = await loginAction({}, form({ email: "ana@", password: "" }));
    expect(state).toEqual({
      fieldErrors: { email: "Informe um e-mail válido.", password: "Informe sua senha." },
      values: { email: "ana@" },
    });
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("401 → 'E-mail ou senha inválidos.', mantém e-mail, sem cookies", async () => {
    mocks.login.mockRejectedValue(new ApiError(401, ["Credenciais inválidas"]));
    const state = await loginAction({}, form(valid));
    expect(state).toEqual({ formError: "E-mail ou senha inválidos.", values: { email: valid.email } });
    expect(JSON.stringify(state)).not.toContain(valid.password);
    expect(nextState.cookies.sets).toEqual([]);
  });

  it("400 da API → mensagens pt-BR por campo", async () => {
    mocks.login.mockRejectedValue(
      new ApiError(400, ["password must be shorter than or equal to 128 characters"]),
    );
    const state = await loginAction({}, form(valid));
    expect(state.fieldErrors).toEqual({ password: "A senha deve ter no máximo 128 caracteres." });
  });

  it("400 com campo desconhecido → alerta genérico", async () => {
    mocks.login.mockRejectedValue(new ApiError(400, ["foo must be bar"]));
    const state = await loginAction({}, form(valid));
    expect(state.formError).toBe("Verifique os dados informados.");
  });

  it.each([[NETWORK_ERROR_STATUS], [500], [503]])("status %i → mensagem genérica", async (status) => {
    mocks.login.mockRejectedValue(new ApiError(status));
    const state = await loginAction({}, form(valid));
    expect(state).toEqual({
      formError: "Não foi possível conectar ao servidor. Tente novamente em instantes.",
      values: { email: valid.email },
    });
  });
});
