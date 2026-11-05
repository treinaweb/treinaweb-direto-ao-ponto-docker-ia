import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/errors";
import { jwtExpiringIn } from "@/lib/auth/__tests__/helpers";
import { captureRedirect, resetNextState } from "@/lib/auth/__tests__/next-mocks";
import { COMMENT_ERRORS } from "@/lib/tickets/comment-labels";
import type { CommentFormState } from "@/lib/tickets/form-state";
import { commentAction } from "./comment-actions";

const mocks = vi.hoisted(() => ({
  createComment: vi.fn(),
  refresh: vi.fn(),
  refreshTokens: vi.fn(),
}));

vi.mock("next/headers", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextNavigationMock);
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("@/lib/api/comments", () => ({ createComment: mocks.createComment }));
vi.mock("@/lib/api/auth", () => ({ refresh: mocks.refreshTokens }));

const TICKET = "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11";

function form(body: string, { internal = false, ticketId = TICKET } = {}) {
  const fd = new FormData();
  fd.set("ticketId", ticketId);
  fd.set("body", body);
  if (internal) fd.set("isInternal", "on");
  return fd;
}

/** Nenhum texto do estado pode estar em inglês (mensagens cruas da API). */
function expectPortuguese(state: CommentFormState) {
  const texts = [state.formError, state.notice, ...Object.values(state.fieldErrors ?? {})].filter(Boolean);
  for (const text of texts) {
    expect(text).not.toMatch(/should|must|ticket|empty|characters|Forbidden|Bad Request/i);
  }
}

let access: string;

beforeEach(() => {
  access = jwtExpiringIn(900);
  resetNextState({ td_access: access, td_refresh: "r1" });
  for (const m of Object.values(mocks)) m.mockReset();
});

describe("commentAction — validação", () => {
  it.each([[""], ["   \n  "]])("corpo %j → erro no campo sem chamar a API", async (body) => {
    const state = await commentAction({}, form(body, { internal: true }));
    expect(state).toEqual({
      fieldErrors: { body: "Escreva um comentário." },
      values: { body, isInternal: "on" },
      submission: 0,
    });
    expect(mocks.createComment).not.toHaveBeenCalled();
  });

  it("5001 caracteres → limite sem chamar a API", async () => {
    const body = "a".repeat(5001);
    const state = await commentAction({}, form(body));
    expect(state.fieldErrors).toEqual({ body: "O comentário deve ter no máximo 5000 caracteres." });
    expect(state.values).toEqual({ body, isInternal: "" });
    expect(mocks.createComment).not.toHaveBeenCalled();
  });

  it("ticketId inválido → dados inválidos sem chamar a API", async () => {
    const state = await commentAction({}, form("Oi", { ticketId: "abc" }));
    expect(state.formError).toBe("Verifique os dados informados.");
    expect(state.values?.body).toBe("Oi");
    expect(mocks.createComment).not.toHaveBeenCalled();
  });
});

describe("commentAction — sucesso", () => {
  it("resposta → trim, sem nota interna, refresh, mensagem e submission + 1", async () => {
    mocks.createComment.mockResolvedValue({});
    const state = await commentAction({ submission: 2 }, form("  Obrigado!  "));
    expect(state).toEqual({ notice: "Resposta enviada.", submission: 3 });
    expect(mocks.createComment).toHaveBeenCalledWith(access, TICKET, { body: "Obrigado!", isInternal: false });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("nota interna → isInternal e mensagem própria", async () => {
    mocks.createComment.mockResolvedValue({});
    const state = await commentAction({}, form("Ver logs", { internal: true }));
    expect(state).toEqual({ notice: "Nota interna adicionada.", submission: 1 });
    expect(mocks.createComment).toHaveBeenCalledWith(access, TICKET, { body: "Ver logs", isInternal: true });
  });
});

describe("commentAction — erros da API", () => {
  it.each([
    ["Ticket fechado não aceita comentários", COMMENT_ERRORS.closed],
    ["Apenas o atendente atribuído pode comentar neste ticket", COMMENT_ERRORS.notAssignee],
    ["Outra regra qualquer", COMMENT_ERRORS.notAllowed],
  ])("422 %j → recarrega, explica e preserva o texto", async (apiMessage, expected) => {
    mocks.createComment.mockRejectedValue(new ApiError(422, [apiMessage]));
    const state = await commentAction({ submission: 1 }, form("Texto", { internal: true }));
    expect(state).toEqual({ formError: expected, values: { body: "Texto", isInternal: "on" }, submission: 1 });
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expectPortuguese(state);
  });

  it("409 → recarrega, avisa e preserva o texto", async () => {
    mocks.createComment.mockRejectedValue(new ApiError(409));
    const state = await commentAction({}, form("Texto"));
    expect(state).toEqual({
      formError: "Este chamado foi alterado por outra pessoa. Confira a conversa e tente novamente.",
      values: { body: "Texto", isInternal: "" },
      submission: 0,
    });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("404 → chamado indisponível, sem refresh", async () => {
    mocks.createComment.mockRejectedValue(new ApiError(404));
    const state = await commentAction({}, form("Texto"));
    expect(state).toEqual({ gone: true, formError: COMMENT_ERRORS.gone, submission: 0 });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it.each([
    [["body should not be empty"], "Escreva um comentário."],
    [["body must be shorter than or equal to 5000 characters"], "O comentário deve ter no máximo 5000 caracteres."],
  ])("400 %j → mensagem pt-BR no campo", async (messages, expected) => {
    mocks.createComment.mockRejectedValue(new ApiError(400, messages));
    const state = await commentAction({}, form("Texto"));
    expect(state).toEqual({ fieldErrors: { body: expected }, values: { body: "Texto", isInternal: "" }, submission: 0 });
    expect(mocks.refresh).not.toHaveBeenCalled();
    expectPortuguese(state);
  });

  it("400 sem campo conhecido → Verifique os dados informados.", async () => {
    mocks.createComment.mockRejectedValue(new ApiError(400, ["isInternal must be a boolean value"]));
    const state = await commentAction({}, form("Texto"));
    expect(state.formError).toBe("Verifique os dados informados.");
    expect(state.values?.body).toBe("Texto");
  });

  it("403 → sem permissão e texto preservado", async () => {
    mocks.createComment.mockRejectedValue(new ApiError(403, ["Apenas a equipe pode criar notas internas"]));
    const state = await commentAction({}, form("Texto", { internal: true }));
    expect(state).toEqual({
      formError: "Você não tem permissão para esta ação.",
      values: { body: "Texto", isInternal: "on" },
      submission: 0,
    });
    expectPortuguese(state);
  });

  it.each([NETWORK_ERROR_STATUS, 500, 503])("falha %s → mensagem genérica e texto preservado", async (status) => {
    mocks.createComment.mockRejectedValue(new ApiError(status));
    const state = await commentAction({}, form("Texto"));
    expect(state.formError).toBe("Não foi possível conectar ao servidor. Tente novamente em instantes.");
    expect(state.values?.body).toBe("Texto");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("401 → renova uma vez e envia uma única vez com o token novo", async () => {
    const renewed = jwtExpiringIn(900);
    mocks.refreshTokens.mockResolvedValue({ accessToken: renewed, refreshToken: "r2" });
    mocks.createComment.mockRejectedValueOnce(new ApiError(401)).mockResolvedValueOnce({});
    expect(await commentAction({}, form("Texto"))).toEqual({ notice: "Resposta enviada.", submission: 1 });
    expect(mocks.refreshTokens).toHaveBeenCalledOnce();
    expect(mocks.createComment).toHaveBeenCalledTimes(2);
    expect(mocks.createComment).toHaveBeenLastCalledWith(renewed, TICKET, { body: "Texto", isInternal: false });
  });

  it("401 com renovação recusada → login", async () => {
    mocks.refreshTokens.mockRejectedValue(new ApiError(401));
    mocks.createComment.mockRejectedValue(new ApiError(401));
    expect(await captureRedirect(() => commentAction({}, form("Texto")))).toBe("/login?aviso=sessao-expirada");
  });
});
