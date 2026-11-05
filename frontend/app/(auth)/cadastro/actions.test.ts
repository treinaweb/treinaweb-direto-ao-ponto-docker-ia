import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/errors";
import { jwtExpiringIn } from "@/lib/auth/__tests__/helpers";
import { captureRedirect, nextState, resetNextState } from "@/lib/auth/__tests__/next-mocks";
import { signupAction } from "./actions";

const mocks = vi.hoisted(() => ({ createUser: vi.fn(), login: vi.fn() }));

vi.mock("next/headers", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextNavigationMock);
vi.mock("@/lib/api/users", () => ({ createUser: mocks.createUser }));
vi.mock("@/lib/api/auth", () => ({ login: mocks.login }));

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const valid = {
  name: "Ana",
  email: "  Ana@Teste.COM ",
  password: "senhaSegura123",
  confirmPassword: "senhaSegura123",
};

beforeEach(() => {
  resetNextState();
  mocks.createUser.mockReset();
  mocks.login.mockReset();
});

describe("signupAction", () => {
  it("cria a conta (e-mail normalizado), entra e vai ao /dashboard", async () => {
    const tokens = { accessToken: jwtExpiringIn(900), refreshToken: "r1" };
    mocks.createUser.mockResolvedValue({ id: "u1", role: "CUSTOMER" });
    mocks.login.mockResolvedValue(tokens);

    expect(await captureRedirect(() => signupAction({}, form(valid)))).toBe("/dashboard");
    expect(mocks.createUser).toHaveBeenCalledWith({
      name: "Ana",
      email: "ana@teste.com",
      password: "senhaSegura123",
    });
    expect(mocks.login).toHaveBeenCalledWith({ email: "ana@teste.com", password: "senhaSegura123" });
    expect(nextState.cookies.values.get("td_refresh")).toBe("r1");
  });

  it("validação falha → erros por campo sem chamar a API", async () => {
    const state = await signupAction(
      {},
      form({ name: "A", email: "ana.teste.com", password: "1234567", confirmPassword: "1234567" }),
    );
    expect(state.fieldErrors).toEqual({
      name: "O nome deve ter entre 2 e 100 caracteres.",
      email: "Informe um e-mail válido.",
      password: "A senha deve ter entre 8 e 128 caracteres.",
    });
    expect(state.values).toEqual({ name: "A", email: "ana.teste.com" });
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it("confirmação diferente → erro no campo de confirmação", async () => {
    const state = await signupAction({}, form({ ...valid, confirmPassword: "outraSenha1" }));
    expect(state.fieldErrors).toEqual({ confirmPassword: "As senhas não conferem." });
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it("409 → 'Este e-mail já está cadastrado.' no campo e-mail", async () => {
    mocks.createUser.mockRejectedValue(new ApiError(409, ["E-mail já cadastrado"]));
    const state = await signupAction({}, form(valid));
    expect(state).toEqual({
      fieldErrors: { email: "Este e-mail já está cadastrado." },
      values: { name: "Ana", email: valid.email },
    });
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("400 da API → mensagens pt-BR por campo", async () => {
    mocks.createUser.mockRejectedValue(
      new ApiError(400, ["name must be longer than or equal to 2 characters", "email must be an email"]),
    );
    const state = await signupAction({}, form(valid));
    expect(state.fieldErrors).toEqual({
      name: "O nome deve ter entre 2 e 100 caracteres.",
      email: "Informe um e-mail válido.",
    });
  });

  it("400 não associável → 'Verifique os dados informados.'", async () => {
    mocks.createUser.mockRejectedValue(new ApiError(400, ["role must be valid"]));
    const state = await signupAction({}, form(valid));
    expect(state.formError).toBe("Verifique os dados informados.");
  });

  it.each([[NETWORK_ERROR_STATUS], [500]])("cadastro com status %i → genérica", async (status) => {
    mocks.createUser.mockRejectedValue(new ApiError(status));
    const state = await signupAction({}, form(valid));
    expect(state.formError).toBe(
      "Não foi possível conectar ao servidor. Tente novamente em instantes.",
    );
    expect(state.values).toEqual({ name: "Ana", email: valid.email });
  });

  it("conta criada mas login falha → /login com aviso, sem recriar a conta", async () => {
    mocks.createUser.mockResolvedValue({ id: "u1" });
    mocks.login.mockRejectedValue(new ApiError(NETWORK_ERROR_STATUS));

    expect(await captureRedirect(() => signupAction({}, form(valid)))).toBe(
      "/login?aviso=conta-criada",
    );
    expect(mocks.createUser).toHaveBeenCalledTimes(1);
    expect(nextState.cookies.sets).toEqual([]);
  });

  it("estado nunca contém senhas", async () => {
    mocks.createUser.mockRejectedValue(new ApiError(409));
    const state = await signupAction({}, form(valid));
    expect(JSON.stringify(state)).not.toContain(valid.password);
  });
});
