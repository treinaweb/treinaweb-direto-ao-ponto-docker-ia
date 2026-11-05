import { beforeEach, describe, expect, it, vi } from "vitest";
import { login, logout, refresh } from "@/lib/api/auth";
import { createCategory, listCategories, updateCategory } from "@/lib/api/categories";
import { createComment, listComments } from "@/lib/api/comments";
import {
  assignTicket,
  countTickets,
  createTicket,
  getTicket,
  listTickets,
  updateTicketStatus,
} from "@/lib/api/tickets";
import { changeUserRole, createStaff, createUser, getMe, listUsers } from "@/lib/api/users";
import { resetApiBaseUrlCache } from "@/lib/env";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  resetApiBaseUrlCache();
  vi.stubEnv("API_BASE_URL", "http://api.test");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response("{}", { status: 200 }));
});

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  const headers = (init?.headers ?? {}) as Record<string, string>;
  return {
    url,
    method: init?.method,
    body: init?.body ? JSON.parse(init.body as string) : undefined,
    auth: headers.Authorization,
  };
}

describe("endpoints de auth e users", () => {
  it("login → POST /auth/login", async () => {
    await login({ email: "a@b.co", password: "x" });
    expect(lastCall()).toEqual({
      url: "http://api.test/auth/login",
      method: "POST",
      body: { email: "a@b.co", password: "x" },
      auth: undefined,
    });
  });

  it("refresh → POST /auth/refresh", async () => {
    await refresh("r1");
    expect(lastCall()).toMatchObject({
      url: "http://api.test/auth/refresh",
      method: "POST",
      body: { refreshToken: "r1" },
    });
  });

  it("logout → POST /auth/logout com Bearer e refresh no corpo", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await logout("a1", "r1");
    expect(lastCall()).toEqual({
      url: "http://api.test/auth/logout",
      method: "POST",
      body: { refreshToken: "r1" },
      auth: "Bearer a1",
    });
  });

  it("createUser → POST /users", async () => {
    await createUser({ name: "Ana", email: "ana@teste.com", password: "12345678" });
    expect(lastCall()).toMatchObject({
      url: "http://api.test/users",
      method: "POST",
      body: { name: "Ana", email: "ana@teste.com", password: "12345678" },
    });
  });

  it("getMe → GET /users/me com Bearer", async () => {
    await getMe("a1");
    expect(lastCall()).toMatchObject({
      url: "http://api.test/users/me",
      method: "GET",
      auth: "Bearer a1",
    });
  });
});

describe("endpoints de administração de usuários", () => {
  it("listUsers → GET /users com página, limite e Bearer", async () => {
    await listUsers("a1", { page: 3, limit: 25 });
    expect(lastCall()).toMatchObject({
      url: "http://api.test/users?page=3&limit=25",
      method: "GET",
      auth: "Bearer a1",
    });
  });

  it("createStaff → POST /users/staff com o corpo JSON e Bearer", async () => {
    const dto = { name: "Bruno", email: "bruno@teste.com", password: "12345678", role: "SUPPORT" } as const;
    await createStaff("a1", dto);
    expect(lastCall()).toEqual({
      url: "http://api.test/users/staff",
      method: "POST",
      body: dto,
      auth: "Bearer a1",
    });
  });

  it("changeUserRole → PATCH /users/{id}/role só com o papel e Bearer", async () => {
    await changeUserRole("a1", "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11", "ADMIN");
    expect(lastCall()).toEqual({
      url: "http://api.test/users/2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11/role",
      method: "PATCH",
      body: { role: "ADMIN" },
      auth: "Bearer a1",
    });
  });
});

describe("endpoints de leitura do painel", () => {
  it("listTickets sem filtros → GET /tickets com Bearer", async () => {
    await listTickets("a1");
    expect(lastCall()).toMatchObject({ url: "http://api.test/tickets", method: "GET", auth: "Bearer a1" });
  });

  it("listTickets com filtros → query string", async () => {
    await listTickets("a1", { page: 2, limit: 5, status: "OPEN", priority: "URGENT" });
    expect(lastCall().url).toBe("http://api.test/tickets?page=2&limit=5&status=OPEN&priority=URGENT");
  });

  it("countTickets → limit=1 e devolve o total", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [], page: 1, limit: 1, total: 42 }), { status: 200 }),
    );
    await expect(countTickets("a1", "WAITING_CUSTOMER")).resolves.toBe(42);
    expect(lastCall()).toMatchObject({
      url: "http://api.test/tickets?limit=1&status=WAITING_CUSTOMER",
      auth: "Bearer a1",
    });
  });

  it("listCategories → GET /categories com Bearer", async () => {
    fetchMock.mockResolvedValueOnce(new Response("[]", { status: 200 }));
    await listCategories("a1");
    expect(lastCall()).toMatchObject({ url: "http://api.test/categories", method: "GET", auth: "Bearer a1" });
  });

  it("createCategory → POST /categories só com name e Bearer", async () => {
    await createCategory("a1", { name: "Rede" });
    expect(lastCall()).toEqual({
      url: "http://api.test/categories",
      method: "POST",
      body: { name: "Rede" },
      auth: "Bearer a1",
    });
  });

  it("updateCategory (renomear) → PATCH /categories/{id} só com name", async () => {
    await updateCategory("a1", "c1", { name: "Redes" });
    expect(lastCall()).toEqual({
      url: "http://api.test/categories/c1",
      method: "PATCH",
      body: { name: "Redes" },
      auth: "Bearer a1",
    });
  });

  it("updateCategory (desativar) → PATCH só com active e id codificado", async () => {
    await updateCategory("a1", "a/b?c", { active: false });
    expect(lastCall()).toEqual({
      url: "http://api.test/categories/a%2Fb%3Fc",
      method: "PATCH",
      body: { active: false },
      auth: "Bearer a1",
    });
  });

  it("listUsers → GET /users paginado com Bearer", async () => {
    await listUsers("a1", { limit: 1 });
    expect(lastCall()).toMatchObject({ url: "http://api.test/users?page=1&limit=1", auth: "Bearer a1" });
  });
});

describe("endpoints de chamados", () => {
  it("createTicket → POST /tickets com corpo e Bearer", async () => {
    const dto = {
      title: "Impressora travada",
      description: "Não imprime desde ontem.",
      priority: "HIGH" as const,
      categoryId: "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11",
    };
    await createTicket("a1", dto);
    expect(lastCall()).toEqual({
      url: "http://api.test/tickets",
      method: "POST",
      body: dto,
      auth: "Bearer a1",
    });
  });

  const ID = "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11";

  it("getTicket → GET /tickets/{id} com Bearer", async () => {
    await getTicket("a1", ID);
    expect(lastCall()).toEqual({
      url: `http://api.test/tickets/${ID}`,
      method: "GET",
      body: undefined,
      auth: "Bearer a1",
    });
  });

  it("assignTicket sem atendente → PATCH /assign com corpo vazio (SUPPORT assume)", async () => {
    await assignTicket("a1", ID);
    expect(lastCall()).toEqual({
      url: `http://api.test/tickets/${ID}/assign`,
      method: "PATCH",
      body: {},
      auth: "Bearer a1",
    });
  });

  it("assignTicket com atendente → PATCH /assign com assigneeId (ADMIN)", async () => {
    await assignTicket("a1", ID, "s1");
    expect(lastCall()).toMatchObject({ method: "PATCH", body: { assigneeId: "s1" } });
  });

  it("updateTicketStatus → PATCH /status com o novo status", async () => {
    await updateTicketStatus("a1", ID, "RESOLVED");
    expect(lastCall()).toEqual({
      url: `http://api.test/tickets/${ID}/status`,
      method: "PATCH",
      body: { status: "RESOLVED" },
      auth: "Bearer a1",
    });
  });
});

describe("endpoints de comentários", () => {
  const ID = "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11";

  it("listComments → GET /tickets/{id}/comments paginado com Bearer", async () => {
    await listComments("a1", ID, { page: 3, limit: 100 });
    expect(lastCall()).toEqual({
      url: `http://api.test/tickets/${ID}/comments?page=3&limit=100`,
      method: "GET",
      body: undefined,
      auth: "Bearer a1",
    });
  });

  it("listComments codifica o id na rota", async () => {
    await listComments("a1", "a/b?c");
    expect(lastCall().url).toBe("http://api.test/tickets/a%2Fb%3Fc/comments?page=1&limit=20");
  });

  it("createComment resposta → POST sem isInternal no corpo", async () => {
    await createComment("a1", ID, { body: "Olá", isInternal: false });
    expect(lastCall()).toEqual({
      url: `http://api.test/tickets/${ID}/comments`,
      method: "POST",
      body: { body: "Olá" },
      auth: "Bearer a1",
    });
  });

  it("createComment nota interna → isInternal: true", async () => {
    await createComment("a1", ID, { body: "Nota", isInternal: true });
    expect(lastCall()).toMatchObject({ method: "POST", body: { body: "Nota", isInternal: true } });
  });

  it("createComment codifica o id na rota", async () => {
    await createComment("a1", "x y", { body: "Oi" });
    expect(lastCall().url).toBe("http://api.test/tickets/x%20y/comments");
  });
});
