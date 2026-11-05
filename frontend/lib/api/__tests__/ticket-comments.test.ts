import { beforeEach, describe, expect, it, vi } from "vitest";
import { COMMENTS_MAX, listTicketComments } from "@/lib/api/comments";
import { resetApiBaseUrlCache } from "@/lib/env";

const fetchMock = vi.fn<typeof fetch>();
const TICKET = "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11";

type C = {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: { id: string; name: string; role: string };
};

function comment(i: number, role = "CUSTOMER", isInternal = false): C {
  return {
    id: `c${i}`,
    body: `Comentário ${i}`,
    isInternal,
    createdAt: new Date(Date.UTC(2026, 9, 14, 12, 0, i)).toISOString(),
    author: { id: `u-${role}`, name: role === "CUSTOMER" ? "Ana" : "Bruno", role },
  };
}

const range = (n: number) => Array.from({ length: n }, (_, i) => comment(i + 1));

/** Simula `GET /tickets/{id}/comments` paginado; `pageOverride` troca o conteúdo de uma página. */
function serve(all: C[], pageOverride: Record<number, C[]> = {}, total = all.length) {
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input));
    const page = Number(url.searchParams.get("page"));
    const limit = Number(url.searchParams.get("limit"));
    const data = pageOverride[page] ?? all.slice((page - 1) * limit, page * limit);
    return new Response(JSON.stringify({ data, page, limit, total }), { status: 200 });
  });
}

const pagesRead = () => fetchMock.mock.calls.map(([u]) => Number(new URL(String(u)).searchParams.get("page")));

beforeEach(() => {
  resetApiBaseUrlCache();
  vi.stubEnv("API_BASE_URL", "http://api.test");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

describe("listTicketComments", () => {
  it("uma página → uma leitura com limit 100 e DTO sem ids de usuário", async () => {
    serve(range(3));
    const result = await listTicketComments("a1", TICKET);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `http://api.test/tickets/${TICKET}/comments?page=1&limit=100`,
    );
    expect(result.total).toBe(3);
    expect(result.truncated).toBe(false);
    expect(result.comments.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
    expect(result.comments[0]).toEqual({
      id: "c1",
      body: "Comentário 1",
      isInternal: false,
      createdAt: comment(1).createdAt,
      authorName: "Ana",
      authorIsStaff: false,
    });
    expect(JSON.stringify(result)).not.toContain("u-CUSTOMER");
  });

  it("sem comentários → lista vazia", async () => {
    serve([]);
    await expect(listTicketComments("a1", TICKET)).resolves.toEqual({
      comments: [],
      total: 0,
      truncated: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("250 comentários → 3 páginas em ordem", async () => {
    serve(range(250));
    const result = await listTicketComments("a1", TICKET);
    expect(pagesRead()).toEqual([1, 2, 3]);
    expect(result.comments).toHaveLength(250);
    expect(result.comments.at(-1)?.id).toBe("c250");
  });

  it("página vazia antes do total → para de ler", async () => {
    serve(range(500), { 3: [] });
    const result = await listTicketComments("a1", TICKET);
    expect(pagesRead()).toEqual([1, 2, 3]);
    expect(result.comments).toHaveLength(200);
  });

  it("comentário repetido entre páginas → aparece uma vez", async () => {
    const all = range(150);
    // Um comentário novo deslocou a página 2: o c100 volta no começo dela.
    serve(all, { 2: [all[99], ...all.slice(100, 150)] });
    const result = await listTicketComments("a1", TICKET);
    expect(result.comments).toHaveLength(150);
    expect(new Set(result.comments.map((c) => c.id)).size).toBe(150);
  });

  it("2.150 comentários → páginas 2 a 22 e só os 2.000 mais recentes", async () => {
    serve(range(2150));
    const result = await listTicketComments("a1", TICKET);
    expect(pagesRead()).toEqual([1, ...Array.from({ length: 21 }, (_, i) => i + 2)]);
    expect(result.truncated).toBe(true);
    expect(result.total).toBe(2150);
    expect(result.comments).toHaveLength(COMMENTS_MAX);
    expect(result.comments[0].id).toBe("c151");
    expect(result.comments.at(-1)?.id).toBe("c2150");
  });

  it("selo de equipe para SUPPORT e ADMIN e nota interna preservada", async () => {
    serve([comment(1, "CUSTOMER"), comment(2, "SUPPORT"), comment(3, "ADMIN", true)]);
    const result = await listTicketComments("a1", TICKET);
    expect(result.comments.map((c) => [c.authorIsStaff, c.isInternal])).toEqual([
      [false, false],
      [true, false],
      [true, true],
    ]);
  });
});
