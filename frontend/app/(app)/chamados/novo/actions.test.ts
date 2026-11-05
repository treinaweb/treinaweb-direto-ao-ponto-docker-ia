import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/errors";
import { jwtExpiringIn } from "@/lib/auth/__tests__/helpers";
import { captureRedirect, resetNextState } from "@/lib/auth/__tests__/next-mocks";
import { TICKET_MESSAGES } from "@/lib/validation/tickets";
import { createTicketAction } from "./actions";

const mocks = vi.hoisted(() => ({ createTicket: vi.fn(), refresh: vi.fn(), refreshTokens: vi.fn() }));

vi.mock("next/headers", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextNavigationMock);
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("@/lib/api/tickets", () => ({ createTicket: mocks.createTicket }));
vi.mock("@/lib/api/auth", () => ({ refresh: mocks.refreshTokens }));

const CATEGORY = "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11";
const valid = {
  title: "  Impressora travada ",
  description: "A impressora do 2º andar não imprime desde ontem.",
  priority: "HIGH",
  categoryId: CATEGORY,
};

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

let access: string;

beforeEach(() => {
  access = jwtExpiringIn(900);
  resetNextState({ td_access: access, td_refresh: "r1" });
  mocks.createTicket.mockReset();
  mocks.refresh.mockReset();
  mocks.refreshTokens.mockReset();
});

describe("createTicketAction", () => {
  it("cria o chamado (com trim) e vai ao detalhe com o aviso", async () => {
    mocks.createTicket.mockResolvedValue({ id: "t1" });
    expect(await captureRedirect(() => createTicketAction({}, form(valid)))).toBe(
      "/chamados/t1?aviso=chamado-aberto",
    );
    expect(mocks.createTicket).toHaveBeenCalledWith(access, {
      title: "Impressora travada",
      description: valid.description,
      priority: "HIGH",
      categoryId: CATEGORY,
    });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("validação falha → erros por campo, valores preservados, sem chamar a API", async () => {
    const input = { title: "Erro", description: "curta", priority: "", categoryId: "" };
    const state = await createTicketAction({}, form(input));
    expect(state.fieldErrors).toEqual({
      title: TICKET_MESSAGES.titleLength,
      description: TICKET_MESSAGES.descriptionLength,
      priority: TICKET_MESSAGES.priorityRequired,
      categoryId: TICKET_MESSAGES.categoryRequired,
    });
    expect(state.values).toEqual(input);
    expect(mocks.createTicket).not.toHaveBeenCalled();
  });

  it("422 → categoria indisponível, categoria limpa e refresh da página", async () => {
    mocks.createTicket.mockRejectedValue(new ApiError(422, ["Categoria inexistente ou inativa"]));
    const state = await createTicketAction({}, form(valid));
    expect(state.fieldErrors).toEqual({ categoryId: TICKET_MESSAGES.categoryUnavailable });
    expect(state.values).toEqual({ ...valid, categoryId: "" });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("400 da API → mensagem pt-BR no campo", async () => {
    mocks.createTicket.mockRejectedValue(
      new ApiError(400, ["title must be longer than or equal to 5 characters"]),
    );
    const state = await createTicketAction({}, form(valid));
    expect(state.fieldErrors).toEqual({ title: TICKET_MESSAGES.titleLength });
    expect(state.values).toEqual(valid);
  });

  it("400 com campo desconhecido → alerta geral", async () => {
    mocks.createTicket.mockRejectedValue(new ApiError(400, ["foo must be a string"]));
    const state = await createTicketAction({}, form(valid));
    expect(state).toEqual({ formError: "Verifique os dados informados.", values: valid });
  });

  it("403 → sem permissão", async () => {
    mocks.createTicket.mockRejectedValue(new ApiError(403, ["Forbidden"]));
    const state = await createTicketAction({}, form(valid));
    expect(state.formError).toBe("Você não tem permissão para esta ação.");
    expect(state.values).toEqual(valid);
  });

  it("falha de rede → mensagem genérica", async () => {
    mocks.createTicket.mockRejectedValue(new ApiError(NETWORK_ERROR_STATUS));
    const state = await createTicketAction({}, form(valid));
    expect(state.formError).toBe(
      "Não foi possível conectar ao servidor. Tente novamente em instantes.",
    );
  });

  it("401 → renova a sessão uma vez e repete o envio", async () => {
    const renewed = jwtExpiringIn(900);
    mocks.refreshTokens.mockResolvedValue({ accessToken: renewed, refreshToken: "r2" });
    mocks.createTicket
      .mockRejectedValueOnce(new ApiError(401))
      .mockResolvedValueOnce({ id: "t1" });

    expect(await captureRedirect(() => createTicketAction({}, form(valid)))).toBe(
      "/chamados/t1?aviso=chamado-aberto",
    );
    expect(mocks.createTicket).toHaveBeenCalledTimes(2);
    expect(mocks.createTicket).toHaveBeenLastCalledWith(renewed, expect.any(Object));
  });

  it("401 e renovação recusada → login com sessão expirada", async () => {
    mocks.refreshTokens.mockRejectedValue(new ApiError(401));
    mocks.createTicket.mockRejectedValue(new ApiError(401));
    expect(await captureRedirect(() => createTicketAction({}, form(valid)))).toBe(
      "/login?aviso=sessao-expirada",
    );
  });
});
