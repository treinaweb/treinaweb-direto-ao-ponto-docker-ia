import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/errors";
import { jwtExpiringIn } from "@/lib/auth/__tests__/helpers";
import { captureRedirect, resetNextState } from "@/lib/auth/__tests__/next-mocks";
import { createCategoryAction, renameCategoryAction, toggleCategoryAction } from "./actions";

const mocks = vi.hoisted(() => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  refresh: vi.fn(),
  refreshTokens: vi.fn(),
}));

vi.mock("next/headers", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextNavigationMock);
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("@/lib/api/categories", () => ({
  createCategory: mocks.createCategory,
  updateCategory: mocks.updateCategory,
}));
vi.mock("@/lib/api/auth", () => ({ refresh: mocks.refreshTokens }));

const ID = "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11";
const LENGTH = "O nome deve ter entre 2 e 60 caracteres.";
const DUPLICATE = "Já existe uma categoria com esse nome.";
const GONE = "Esta categoria não foi encontrada. A lista foi atualizada.";
const FORBIDDEN = "Você não tem permissão para esta ação.";
const GENERIC = "Não foi possível conectar ao servidor. Tente novamente em instantes.";
const INVALID = "Verifique os dados informados.";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

let access: string;

beforeEach(() => {
  access = jwtExpiringIn(900);
  resetNextState({ td_access: access, td_refresh: "r1" });
  mocks.createCategory.mockReset();
  mocks.updateCategory.mockReset();
  mocks.refresh.mockReset();
  mocks.refreshTokens.mockReset();
});

describe("createCategoryAction", () => {
  const create = (name: string) => createCategoryAction({}, form({ name }));

  it("cria com trim, relê a lista e anuncia", async () => {
    mocks.createCategory.mockResolvedValue({ id: ID, name: "Financeiro", active: true });
    expect(await create("  Financeiro  ")).toEqual({ done: { notice: "Categoria criada." } });
    expect(mocks.createCategory).toHaveBeenCalledWith(access, { name: "Financeiro" });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it.each(["A", "   ", "", "a".repeat(61)])("nome inválido %j → erro no campo sem chamar a API", async (name) => {
    expect(await create(name)).toEqual({ fieldErrors: { name: LENGTH }, values: { name } });
    expect(mocks.createCategory).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("409 → nome duplicado no campo, valor bruto preservado", async () => {
    mocks.createCategory.mockRejectedValue(new ApiError(409, ["Já existe uma categoria com esse nome"]));
    expect(await create("Acesso ")).toEqual({ fieldErrors: { name: DUPLICATE }, values: { name: "Acesso " } });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("mesmo nome com outra caixa é enviado (sem bloqueio no frontend)", async () => {
    mocks.createCategory.mockResolvedValue({ id: ID, name: "ACESSO", active: true });
    expect((await create("ACESSO")).done).toEqual({ notice: "Categoria criada." });
    expect(mocks.createCategory).toHaveBeenCalledWith(access, { name: "ACESSO" });
  });

  it("400 conhecido → mensagem de tamanho no campo", async () => {
    mocks.createCategory.mockRejectedValue(
      new ApiError(400, ["name must be longer than or equal to 2 characters"]),
    );
    expect(await create("Ab")).toEqual({ fieldErrors: { name: LENGTH }, values: { name: "Ab" } });
  });

  it("400 desconhecido → alerta geral", async () => {
    mocks.createCategory.mockRejectedValue(new ApiError(400, ["foo should not exist"]));
    expect(await create("Rede")).toEqual({ formError: INVALID, values: { name: "Rede" } });
  });

  it("403 → sem permissão, nome mantido", async () => {
    mocks.createCategory.mockRejectedValue(new ApiError(403, ["Forbidden resource"]));
    expect(await create("Rede")).toEqual({ formError: FORBIDDEN, values: { name: "Rede" } });
  });

  it.each([NETWORK_ERROR_STATUS, 500])("falha %s → mensagem genérica", async (status) => {
    mocks.createCategory.mockRejectedValue(new ApiError(status));
    expect(await create("Rede")).toEqual({ formError: GENERIC, values: { name: "Rede" } });
  });

  it("401 → renova a sessão uma vez e repete a criação", async () => {
    const renewed = jwtExpiringIn(900);
    mocks.refreshTokens.mockResolvedValue({ accessToken: renewed, refreshToken: "r2" });
    mocks.createCategory.mockRejectedValueOnce(new ApiError(401)).mockResolvedValueOnce({ id: ID });

    expect((await create("Rede")).done).toEqual({ notice: "Categoria criada." });
    expect(mocks.refreshTokens).toHaveBeenCalledOnce();
    expect(mocks.createCategory).toHaveBeenCalledTimes(2);
    expect(mocks.createCategory).toHaveBeenLastCalledWith(renewed, { name: "Rede" });
  });

  it("401 e renovação recusada → login com sessão expirada", async () => {
    mocks.refreshTokens.mockRejectedValue(new ApiError(401));
    mocks.createCategory.mockRejectedValue(new ApiError(401));
    expect(await captureRedirect(() => create("Rede"))).toBe("/login?aviso=sessao-expirada");
  });
});

describe("renameCategoryAction", () => {
  const rename = (name: string, currentName = "Acesso", categoryId = ID) =>
    renameCategoryAction({}, form({ categoryId, name, currentName }));

  it("renomeia só com { name }, relê a lista e anuncia", async () => {
    mocks.updateCategory.mockResolvedValue({ id: ID, name: "Acesso e senhas", active: false });
    expect(await rename("  Acesso e senhas ")).toEqual({ done: { notice: "Categoria renomeada." } });
    expect(mocks.updateCategory).toHaveBeenCalledWith(access, ID, { name: "Acesso e senhas" });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("nome igual ao atual (com trim) → fecha sem chamar a API", async () => {
    expect(await rename("  Acesso  ")).toEqual({ done: {} });
    expect(mocks.updateCategory).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("só a caixa muda → envia à API", async () => {
    mocks.updateCategory.mockResolvedValue({ id: ID, name: "ACESSO", active: true });
    expect((await rename("ACESSO")).done).toEqual({ notice: "Categoria renomeada." });
    expect(mocks.updateCategory).toHaveBeenCalledWith(access, ID, { name: "ACESSO" });
  });

  it("nome inválido → erro no campo sem chamar a API", async () => {
    expect(await rename(" A ")).toEqual({ fieldErrors: { name: LENGTH }, values: { name: " A " } });
    expect(mocks.updateCategory).not.toHaveBeenCalled();
  });

  it("id inválido → alerta geral sem chamar a API", async () => {
    expect(await rename("Rede", "Acesso", "abc")).toEqual({ formError: INVALID, values: { name: "Rede" } });
    expect(mocks.updateCategory).not.toHaveBeenCalled();
  });

  it("409 → nome duplicado no campo", async () => {
    mocks.updateCategory.mockRejectedValue(new ApiError(409, ["Já existe uma categoria com esse nome"]));
    expect(await rename("Rede")).toEqual({ fieldErrors: { name: DUPLICATE }, values: { name: "Rede" } });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("404 → relê a lista e fecha com gone", async () => {
    mocks.updateCategory.mockRejectedValue(new ApiError(404, ["Categoria não encontrada"]));
    expect(await rename("Rede")).toEqual({ gone: true });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("400 conhecido e desconhecido", async () => {
    mocks.updateCategory.mockRejectedValueOnce(
      new ApiError(400, ["name must be shorter than or equal to 60 characters"]),
    );
    expect((await rename("Rede")).fieldErrors).toEqual({ name: LENGTH });
    mocks.updateCategory.mockRejectedValueOnce(new ApiError(400, ["Informe name e/ou active"]));
    expect(await rename("Rede")).toEqual({ formError: INVALID, values: { name: "Rede" } });
  });

  it("403 e rede", async () => {
    mocks.updateCategory.mockRejectedValueOnce(new ApiError(403));
    expect((await rename("Rede")).formError).toBe(FORBIDDEN);
    mocks.updateCategory.mockRejectedValueOnce(new ApiError(NETWORK_ERROR_STATUS));
    expect((await rename("Rede")).formError).toBe(GENERIC);
  });

  it("401 → renova e repete uma vez", async () => {
    const renewed = jwtExpiringIn(900);
    mocks.refreshTokens.mockResolvedValue({ accessToken: renewed, refreshToken: "r2" });
    mocks.updateCategory.mockRejectedValueOnce(new ApiError(401)).mockResolvedValueOnce({ id: ID });
    expect((await rename("Rede")).done).toEqual({ notice: "Categoria renomeada." });
    expect(mocks.updateCategory).toHaveBeenCalledTimes(2);
    expect(mocks.updateCategory).toHaveBeenLastCalledWith(renewed, ID, { name: "Rede" });
  });

  it("401 e renovação recusada → login", async () => {
    mocks.refreshTokens.mockRejectedValue(new ApiError(401));
    mocks.updateCategory.mockRejectedValue(new ApiError(401));
    expect(await captureRedirect(() => rename("Rede"))).toBe("/login?aviso=sessao-expirada");
  });
});

describe("toggleCategoryAction", () => {
  const toggle = (intent: string) => toggleCategoryAction({}, form({ intent }));

  it("desativar → só { active: false }, relê e anuncia", async () => {
    mocks.updateCategory.mockResolvedValue({ id: ID, name: "Rede", active: false });
    expect(await toggle(`deactivate:${ID}`)).toEqual({ notice: "Categoria desativada." });
    expect(mocks.updateCategory).toHaveBeenCalledWith(access, ID, { active: false });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("ativar → só { active: true }", async () => {
    mocks.updateCategory.mockResolvedValue({ id: ID, name: "Rede", active: true });
    expect(await toggle(`activate:${ID}`)).toEqual({ notice: "Categoria ativada." });
    expect(mocks.updateCategory).toHaveBeenCalledWith(access, ID, { active: true });
  });

  it.each(["", "remove:" + ID, "activate:abc"])("intent inválido %j → sem chamar a API", async (intent) => {
    expect(await toggle(intent)).toEqual({ error: INVALID });
    expect(mocks.updateCategory).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("404 → relê a lista e explica", async () => {
    mocks.updateCategory.mockRejectedValue(new ApiError(404));
    expect(await toggle(`deactivate:${ID}`)).toEqual({ error: GONE });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("403 → sem permissão, sem refresh", async () => {
    mocks.updateCategory.mockRejectedValue(new ApiError(403));
    expect(await toggle(`deactivate:${ID}`)).toEqual({ error: FORBIDDEN });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it.each([NETWORK_ERROR_STATUS, 503])("falha %s → mensagem genérica", async (status) => {
    mocks.updateCategory.mockRejectedValue(new ApiError(status));
    expect(await toggle(`deactivate:${ID}`)).toEqual({ error: GENERIC });
  });

  it("401 → renova e repete uma vez", async () => {
    const renewed = jwtExpiringIn(900);
    mocks.refreshTokens.mockResolvedValue({ accessToken: renewed, refreshToken: "r2" });
    mocks.updateCategory.mockRejectedValueOnce(new ApiError(401)).mockResolvedValueOnce({ id: ID });
    expect(await toggle(`activate:${ID}`)).toEqual({ notice: "Categoria ativada." });
    expect(mocks.updateCategory).toHaveBeenCalledTimes(2);
    expect(mocks.updateCategory).toHaveBeenLastCalledWith(renewed, ID, { active: true });
  });

  it("401 e renovação recusada → login, categoria não muda", async () => {
    mocks.refreshTokens.mockRejectedValue(new ApiError(401));
    mocks.updateCategory.mockRejectedValue(new ApiError(401));
    expect(await captureRedirect(() => toggle(`deactivate:${ID}`))).toBe("/login?aviso=sessao-expirada");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
