import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/errors";
import { jwtExpiringIn } from "@/lib/auth/__tests__/helpers";
import { captureRedirect, resetNextState } from "@/lib/auth/__tests__/next-mocks";
import { ACTION_ERRORS } from "@/lib/tickets/action-labels";
import { ticketAction } from "./actions";

const mocks = vi.hoisted(() => ({
  assignTicket: vi.fn(),
  updateTicketStatus: vi.fn(),
  refresh: vi.fn(),
  refreshTokens: vi.fn(),
}));

vi.mock("next/headers", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextNavigationMock);
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("@/lib/api/tickets", () => ({
  assignTicket: mocks.assignTicket,
  updateTicketStatus: mocks.updateTicketStatus,
}));
vi.mock("@/lib/api/auth", () => ({ refresh: mocks.refreshTokens }));

const TICKET = "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11";
const AGENT = "9a1f0c39-6b39-4b8a-9d36-2c2a1c0e9d22";

function form(intent: string, assigneeId = "") {
  const fd = new FormData();
  fd.set("ticketId", TICKET);
  fd.set("intent", intent);
  if (assigneeId) fd.set("assigneeId", assigneeId);
  return fd;
}

let access: string;

beforeEach(() => {
  access = jwtExpiringIn(900);
  resetNextState({ td_access: access, td_refresh: "r1" });
  for (const m of Object.values(mocks)) m.mockReset();
});

describe("ticketAction — sucesso", () => {
  it("assumir → assign sem atendente, refresh e mensagem", async () => {
    mocks.assignTicket.mockResolvedValue({ assignee: { name: "Bia" } });
    expect(await ticketAction({}, form("assume"))).toEqual({ notice: "Chamado assumido." });
    expect(mocks.assignTicket).toHaveBeenCalledWith(access, TICKET);
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("atribuir → assign com atendente e nome da resposta", async () => {
    mocks.assignTicket.mockResolvedValue({ assignee: { name: "Bruno" } });
    expect(await ticketAction({}, form("assign", AGENT))).toEqual({
      notice: "Chamado atribuído a Bruno.",
    });
    expect(mocks.assignTicket).toHaveBeenCalledWith(access, TICKET, AGENT);
  });

  it.each([
    ["RESOLVED", "Chamado resolvido."],
    ["WAITING_CUSTOMER", "Chamado aguardando o cliente."],
    ["IN_PROGRESS", "Chamado reaberto."],
    ["CLOSED", "Chamado fechado."],
  ])("status %s → mensagem", async (to, notice) => {
    mocks.updateTicketStatus.mockResolvedValue({});
    expect(await ticketAction({}, form(`status:${to}`))).toEqual({ notice });
    expect(mocks.updateTicketStatus).toHaveBeenCalledWith(access, TICKET, to);
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
});

describe("ticketAction — entrada inválida", () => {
  it.each([["status:OPEN"], ["delete"], ["assign"]])("%s → dados inválidos sem chamar a API", async (intent) => {
    expect(await ticketAction({}, form(intent))).toEqual({ error: "Verifique os dados informados." });
    expect(mocks.assignTicket).not.toHaveBeenCalled();
    expect(mocks.updateTicketStatus).not.toHaveBeenCalled();
  });
});

describe("ticketAction — erros da API", () => {
  it("409 → recarrega e avisa da alteração por outra pessoa", async () => {
    mocks.updateTicketStatus.mockRejectedValue(new ApiError(409));
    expect(await ticketAction({}, form("status:RESOLVED"))).toEqual({ error: ACTION_ERRORS.conflict });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("422 → recarrega e avisa que a ação não está disponível", async () => {
    mocks.updateTicketStatus.mockRejectedValue(new ApiError(422, ["Transição não permitida"]));
    expect(await ticketAction({}, form("status:CLOSED"))).toEqual({ error: ACTION_ERRORS.notAllowed });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("404 → chamado indisponível, sem refresh", async () => {
    mocks.assignTicket.mockRejectedValue(new ApiError(404));
    expect(await ticketAction({}, form("assume"))).toEqual({ gone: true, error: ACTION_ERRORS.gone });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("403 → sem permissão", async () => {
    mocks.assignTicket.mockRejectedValue(new ApiError(403));
    expect(await ticketAction({}, form("assume"))).toEqual({
      error: "Você não tem permissão para esta ação.",
    });
  });

  it("400 → dados inválidos", async () => {
    mocks.assignTicket.mockRejectedValue(new ApiError(400, ["assigneeId é obrigatório"]));
    expect(await ticketAction({}, form("assign", AGENT))).toEqual({
      error: "Verifique os dados informados.",
    });
  });

  it("rede → mensagem genérica, sem refresh", async () => {
    mocks.updateTicketStatus.mockRejectedValue(new ApiError(NETWORK_ERROR_STATUS));
    expect(await ticketAction({}, form("status:RESOLVED"))).toEqual({
      error: "Não foi possível conectar ao servidor. Tente novamente em instantes.",
    });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("401 → renova uma vez e repete a ação", async () => {
    const renewed = jwtExpiringIn(900);
    mocks.refreshTokens.mockResolvedValue({ accessToken: renewed, refreshToken: "r2" });
    mocks.updateTicketStatus.mockRejectedValueOnce(new ApiError(401)).mockResolvedValueOnce({});
    expect(await ticketAction({}, form("status:RESOLVED"))).toEqual({ notice: "Chamado resolvido." });
    expect(mocks.updateTicketStatus).toHaveBeenCalledTimes(2);
    expect(mocks.updateTicketStatus).toHaveBeenLastCalledWith(renewed, TICKET, "RESOLVED");
  });

  it("401 com renovação recusada → login", async () => {
    mocks.refreshTokens.mockRejectedValue(new ApiError(401));
    mocks.updateTicketStatus.mockRejectedValue(new ApiError(401));
    expect(await captureRedirect(() => ticketAction({}, form("status:RESOLVED")))).toBe(
      "/login?aviso=sessao-expirada",
    );
  });
});
