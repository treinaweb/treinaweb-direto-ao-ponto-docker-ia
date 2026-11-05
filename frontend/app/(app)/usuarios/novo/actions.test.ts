import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/errors";
import { jwtExpiringIn } from "@/lib/auth/__tests__/helpers";
import { captureRedirect, nextState, resetNextState } from "@/lib/auth/__tests__/next-mocks";
import { createStaffAction } from "./actions";

const mocks = vi.hoisted(() => ({ createStaff: vi.fn(), listUsers: vi.fn(), refreshTokens: vi.fn() }));

vi.mock("next/headers", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextNavigationMock);
vi.mock("@/lib/api/users", () => ({ createStaff: mocks.createStaff, listUsers: mocks.listUsers }));
vi.mock("@/lib/api/auth", () => ({ refresh: mocks.refreshTokens }));

const PASSWORD = "senhaInicial-987";
const GENERIC = "Não foi possível conectar ao servidor. Tente novamente em instantes.";

const valid = { name: "  Bruno Atendente ", email: "  Bruno@Teste.COM ", password: PASSWORD, role: "SUPPORT" };
const keptValues = { name: valid.name, email: valid.email, role: "SUPPORT" };

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

function total(n: number) {
  return { data: [], page: 1, limit: 1, total: n };
}

let access: string;

beforeEach(() => {
  access = jwtExpiringIn(900);
  resetNextState({ td_access: access, td_refresh: "r1" });
  mocks.createStaff.mockReset();
  mocks.listUsers.mockReset();
  mocks.refreshTokens.mockReset();
});

describe("createStaffAction", () => {
  it("cadastra (e-mail normalizado) e vai à última página com o aviso", async () => {
    mocks.createStaff.mockResolvedValue({ id: "u1" });
    mocks.listUsers.mockResolvedValue(total(490));

    expect(await captureRedirect(() => createStaffAction({}, form(valid)))).toBe(
      "/usuarios?page=20&aviso=usuario-cadastrado",
    );
    expect(mocks.createStaff).toHaveBeenCalledWith(access, {
      name: "Bruno Atendente",
      email: "bruno@teste.com",
      password: PASSWORD,
      role: "SUPPORT",
    });
    expect(mocks.listUsers).toHaveBeenCalledWith(access, { page: 1, limit: 1 });
  });

  it("total cabe na primeira página → /usuarios com o aviso", async () => {
    mocks.createStaff.mockResolvedValue({ id: "u1" });
    mocks.listUsers.mockResolvedValue(total(25));
    expect(await captureRedirect(() => createStaffAction({}, form(valid)))).toBe(
      "/usuarios?aviso=usuario-cadastrado",
    );
  });

  it("total indisponível → /usuarios com o aviso, sem cadastrar de novo", async () => {
    mocks.createStaff.mockResolvedValue({ id: "u1" });
    mocks.listUsers.mockRejectedValue(new ApiError(NETWORK_ERROR_STATUS));

    expect(await captureRedirect(() => createStaffAction({}, form(valid)))).toBe(
      "/usuarios?aviso=usuario-cadastrado",
    );
    expect(mocks.createStaff).toHaveBeenCalledOnce();
  });

  it("validação falha → erros por campo, valores sem a senha, sem chamar a API", async () => {
    const input = { name: "A", email: "bruno.teste.com", password: "1234567", role: "CUSTOMER" };
    const state = await createStaffAction({}, form(input));
    expect(state).toEqual({
      fieldErrors: {
        name: "O nome deve ter entre 2 e 100 caracteres.",
        email: "Informe um e-mail válido.",
        password: "A senha deve ter entre 8 e 128 caracteres.",
        role: "Selecione o papel.",
      },
      values: { name: "A", email: "bruno.teste.com", role: "CUSTOMER" },
    });
    expect(mocks.createStaff).not.toHaveBeenCalled();
  });

  it("campos vazios → mensagens de obrigatório", async () => {
    const state = await createStaffAction({}, form({ name: "", email: "", password: "", role: "" }));
    expect(state.fieldErrors).toEqual({
      name: "Informe o nome.",
      email: "Informe o e-mail.",
      password: "Defina uma senha.",
      role: "Selecione o papel.",
    });
    expect(mocks.createStaff).not.toHaveBeenCalled();
  });

  it("409 → 'Este e-mail já está cadastrado.' no e-mail, valores preservados", async () => {
    mocks.createStaff.mockRejectedValue(new ApiError(409, ["E-mail já cadastrado"]));
    const state = await createStaffAction({}, form(valid));
    expect(state).toEqual({ fieldErrors: { email: "Este e-mail já está cadastrado." }, values: keptValues });
    expect(mocks.listUsers).not.toHaveBeenCalled();
  });

  it("400 da API → mensagens pt-BR por campo", async () => {
    mocks.createStaff.mockRejectedValue(
      new ApiError(400, [
        "email must be an email",
        "role must be one of the following values: SUPPORT, ADMIN",
        "password must be longer than or equal to 8 characters",
        "name must be shorter than or equal to 100 characters",
      ]),
    );
    const state = await createStaffAction({}, form(valid));
    expect(state).toEqual({
      fieldErrors: {
        email: "Informe um e-mail válido.",
        role: "Selecione o papel.",
        password: "A senha deve ter entre 8 e 128 caracteres.",
        name: "O nome deve ter entre 2 e 100 caracteres.",
      },
      values: keptValues,
    });
  });

  it("400 não associável → 'Verifique os dados informados.'", async () => {
    mocks.createStaff.mockRejectedValue(new ApiError(400, ["foo must be a string"]));
    const state = await createStaffAction({}, form(valid));
    expect(state).toEqual({ formError: "Verifique os dados informados.", values: keptValues });
  });

  it("403 → sem permissão, valores preservados", async () => {
    mocks.createStaff.mockRejectedValue(new ApiError(403, ["Forbidden resource"]));
    const state = await createStaffAction({}, form(valid));
    expect(state).toEqual({ formError: "Você não tem permissão para esta ação.", values: keptValues });
  });

  it.each([[NETWORK_ERROR_STATUS], [500]])("status %i → mensagem genérica", async (status) => {
    mocks.createStaff.mockRejectedValue(new ApiError(status));
    const state = await createStaffAction({}, form(valid));
    expect(state).toEqual({ formError: GENERIC, values: keptValues });
  });

  it("estado nunca contém a senha, em nenhum erro", async () => {
    const errors = [new ApiError(409), new ApiError(400, ["name must be a string"]), new ApiError(403), new ApiError(0)];
    for (const error of errors) {
      mocks.createStaff.mockRejectedValueOnce(error);
      const state = await createStaffAction({}, form(valid));
      expect(JSON.stringify(state)).not.toContain(PASSWORD);
    }
    const invalid = await createStaffAction({}, form({ ...valid, name: "A" }));
    expect(JSON.stringify(invalid)).not.toContain(PASSWORD);
  });

  it("401 → renova a sessão uma vez e repete o cadastro uma vez", async () => {
    const renewed = jwtExpiringIn(900);
    mocks.refreshTokens.mockResolvedValue({ accessToken: renewed, refreshToken: "r2" });
    mocks.createStaff.mockRejectedValueOnce(new ApiError(401)).mockResolvedValueOnce({ id: "u1" });
    mocks.listUsers.mockResolvedValue(total(26));

    expect(await captureRedirect(() => createStaffAction({}, form(valid)))).toBe(
      "/usuarios?page=2&aviso=usuario-cadastrado",
    );
    expect(mocks.refreshTokens).toHaveBeenCalledOnce();
    expect(mocks.createStaff).toHaveBeenCalledTimes(2);
    expect(mocks.createStaff).toHaveBeenLastCalledWith(renewed, expect.objectContaining({ email: "bruno@teste.com" }));
    expect(mocks.listUsers).toHaveBeenCalledWith(renewed, { page: 1, limit: 1 });
    expect(nextState.cookies.values.get("td_refresh")).toBe("r2");
  });

  it("401 e renovação recusada → login com sessão expirada, sem cadastrar", async () => {
    // Refresh token próprio: o single-flight reaproveita renovações recentes do mesmo token.
    resetNextState({ td_access: access, td_refresh: "r-recusado" });
    mocks.refreshTokens.mockRejectedValue(new ApiError(401));
    mocks.createStaff.mockRejectedValue(new ApiError(401));

    expect(await captureRedirect(() => createStaffAction({}, form(valid)))).toBe(
      "/login?aviso=sessao-expirada",
    );
    expect(mocks.createStaff).toHaveBeenCalledOnce();
    expect(mocks.listUsers).not.toHaveBeenCalled();
  });
});
