import { beforeEach, describe, expect, it, vi } from "vitest";
import { SUPPORT_AGENTS_MAX_PAGES, listSupportAgents } from "@/lib/api/users";
import { resetApiBaseUrlCache } from "@/lib/env";

const fetchMock = vi.fn<typeof fetch>();

type U = { id: string; name: string; role: string; email: string };
const user = (id: string, name: string, role: string): U => ({ id, name, role, email: `${id}@x.co` });

/** Simula `GET /users` paginado a partir de uma lista completa. */
function serve(all: U[]) {
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input));
    const page = Number(url.searchParams.get("page"));
    const limit = Number(url.searchParams.get("limit"));
    const data = all.slice((page - 1) * limit, page * limit);
    return new Response(JSON.stringify({ data, page, limit, total: all.length }), { status: 200 });
  });
}

beforeEach(() => {
  resetApiBaseUrlCache();
  vi.stubEnv("API_BASE_URL", "http://api.test");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

describe("listSupportAgents", () => {
  it("filtra SUPPORT, ordena em pt-BR e não expõe e-mail", async () => {
    serve([
      user("1", "Zeca", "SUPPORT"),
      user("2", "Ana", "CUSTOMER"),
      user("3", "Álvaro", "SUPPORT"),
      user("4", "Bia", "ADMIN"),
      user("5", "bruno", "SUPPORT"),
    ]);
    const agents = await listSupportAgents("a1");
    expect(agents).toEqual([
      { id: "3", name: "Álvaro" },
      { id: "5", name: "bruno" },
      { id: "1", name: "Zeca" },
    ]);
    expect(JSON.stringify(agents)).not.toContain("@");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("http://api.test/users?page=1&limit=100");
  });

  it("percorre várias páginas até cobrir o total", async () => {
    const all = Array.from({ length: 250 }, (_, i) =>
      user(String(i), `Pessoa ${String(i).padStart(3, "0")}`, i % 50 === 0 ? "SUPPORT" : "CUSTOMER"),
    );
    serve(all);
    const agents = await listSupportAgents("a1");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(agents.map((a) => a.id)).toEqual(["0", "50", "100", "150", "200"]);
  });

  it("respeita o teto de páginas", async () => {
    const all = Array.from({ length: 100 * (SUPPORT_AGENTS_MAX_PAGES + 5) }, (_, i) =>
      user(String(i), `S${i}`, "SUPPORT"),
    );
    serve(all);
    const agents = await listSupportAgents("a1");
    expect(fetchMock).toHaveBeenCalledTimes(SUPPORT_AGENTS_MAX_PAGES);
    expect(agents).toHaveLength(100 * SUPPORT_AGENTS_MAX_PAGES);
  });

  it("sem atendentes → lista vazia", async () => {
    serve([user("1", "Ana", "CUSTOMER")]);
    await expect(listSupportAgents("a1")).resolves.toEqual([]);
  });
});
