import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ThreadComment } from "@/lib/api/comments";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/errors";
import { jwtExpiringIn } from "@/lib/auth/__tests__/helpers";
import { captureRedirect, resetNextState } from "@/lib/auth/__tests__/next-mocks";
import { CommentThread } from "@/components/tickets/comment-thread";

const mocks = vi.hoisted(() => ({ listTicketComments: vi.fn() }));

vi.mock("next/headers", async () => (await import("@/lib/auth/__tests__/next-mocks")).nextHeadersMock);
vi.mock("next/navigation", async () => ({
  ...(await import("@/lib/auth/__tests__/next-mocks")).nextNavigationMock,
  useRouter: () => ({ refresh: () => {} }),
}));
vi.mock("@/lib/api/comments", () => ({ COMMENTS_MAX: 2000, listTicketComments: mocks.listTicketComments }));

const TICKET = "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11";

function comment(over: Partial<ThreadComment> = {}): ThreadComment {
  return {
    id: "c1",
    body: "Olá",
    isInternal: false,
    createdAt: "2026-10-14T15:30:00.000Z",
    authorName: "Ana",
    authorIsStaff: false,
    ...over,
  };
}

async function render() {
  return renderToStaticMarkup(await CommentThread({ ticketId: TICKET }));
}

beforeEach(() => {
  resetNextState({ td_access: jwtExpiringIn(900) });
  mocks.listTicketComments.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("CommentThread", () => {
  it("lista em ordem com autor, selos e data legível por máquina", async () => {
    mocks.listTicketComments.mockResolvedValue({
      comments: [
        comment(),
        comment({ id: "c2", authorName: "Bruno", authorIsStaff: true, body: "Pode enviar o print?" }),
      ],
      total: 2,
      truncated: false,
    });
    const html = await render();
    expect(html).toContain('<ol aria-label="Conversa"');
    expect(html.indexOf("Ana")).toBeLessThan(html.indexOf("Bruno"));
    expect(html).toContain(">Cliente<");
    expect(html).toContain(">Equipe<");
    expect(html).toContain('<time dateTime="2026-10-14T15:30:00.000Z"');
    expect(html).toContain("14/10/2026, 12:30");
    expect(html).not.toContain("Nota interna");
    expect(mocks.listTicketComments).toHaveBeenCalledWith(expect.any(String), TICKET);
  });

  it("nota interna tem rótulo e fundo próprios", async () => {
    mocks.listTicketComments.mockResolvedValue({
      comments: [comment({ id: "n1", isInternal: true, authorIsStaff: true, authorName: "Bruno" })],
      total: 1,
      truncated: false,
    });
    const html = await render();
    expect(html).toContain("Nota interna");
    expect(html).toContain("bg-internal-note");
    expect(html).toContain('data-internal="true"');
  });

  it("texto com marcação aparece literal, com quebras preservadas", async () => {
    mocks.listTicketComments.mockResolvedValue({
      comments: [comment({ body: "<b>urgente</b>\n\nfim" })],
      total: 1,
      truncated: false,
    });
    const html = await render();
    expect(html).toContain("&lt;b&gt;urgente&lt;/b&gt;\n\nfim");
    expect(html).not.toContain("<b>");
    expect(html).toContain("whitespace-pre-wrap");
    expect(html).toContain("break-words");
  });

  it("sem comentários → Nenhum comentário ainda.", async () => {
    mocks.listTicketComments.mockResolvedValue({ comments: [], total: 0, truncated: false });
    const html = await render();
    expect(html).toContain("Nenhum comentário ainda.");
    expect(html).not.toContain("<ol");
  });

  it("acima do teto → aviso com os números formatados", async () => {
    mocks.listTicketComments.mockResolvedValue({
      comments: [comment()],
      total: 2150,
      truncated: true,
    });
    const html = await render();
    expect(html).toContain("Esta conversa tem 2.150 comentários. Exibindo os 2.000 mais recentes.");
  });

  it.each([NETWORK_ERROR_STATUS, 500, 404])("falha %s → mensagem isolada sem texto técnico", async (status) => {
    mocks.listTicketComments.mockRejectedValue(new ApiError(status, ["Internal server error"]));
    const html = await render();
    expect(html).toContain("Não foi possível carregar os comentários.");
    expect(html).toContain("Tentar novamente");
    expect(html).not.toMatch(/Internal|500|404|API/);
  });

  it("401 → login com aviso de sessão expirada", async () => {
    mocks.listTicketComments.mockRejectedValue(new ApiError(401));
    expect(await captureRedirect(render)).toBe("/login?aviso=sessao-expirada");
  });
});
