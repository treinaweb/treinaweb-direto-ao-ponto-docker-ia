import { expect, test, type BrowserContext, type Page } from "@playwright/test";

export const PASSWORD = "senhaSegura123";

/** E-mail único para usuários descartáveis (nunca reutilize os fixos em testes de sessão). */
export function uniqueEmail(tag = "user") {
  const rand = Math.random().toString(36).slice(2, 8);
  return `e2e+${tag}-${Date.now()}-${rand}@treinadesk.test`;
}

export function apiUrl(path: string) {
  const base = process.env.API_BASE_URL;
  if (!base) throw new Error("API_BASE_URL não definida no .env.e2e.");
  return new URL(path, base).toString();
}

/** Prefixo único dos dados criados pelos testes (a API e o banco são compartilhados). */
export function e2eTitle(text: string) {
  return `[e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}] ${text}`;
}

async function apiJson<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  const response = await fetch(apiUrl(path), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  if (!response.ok) {
    throw new Error(`API ${rest.method ?? "GET"} ${path} respondeu ${response.status}.`);
  }
  return (await response.json()) as T;
}

/** Access token de um usuário fixo, obtido direto na API (sem passar pelo frontend). */
export async function apiToken(role: FixedRole) {
  const { email, password } = fixedUser(role);
  const tokens = await apiJson<{ accessToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return tokens.accessToken;
}

type ApiTicket = { id: string; title: string; status: string; priority: string };

/** Abre um chamado como o cliente fixo, com título prefixado e a primeira categoria ativa. */
export async function createTicketAsCustomer(
  data: {
    title?: string;
    description?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  } = {},
): Promise<ApiTicket> {
  const token = await apiToken("CUSTOMER");
  const categories = await apiJson<Array<{ id: string }>>("/categories", { token });
  if (categories.length === 0) {
    throw new Error("Nenhuma categoria ativa na API: crie uma para rodar os testes de chamados.");
  }
  return apiJson<ApiTicket>("/tickets", {
    method: "POST",
    token,
    body: JSON.stringify({
      title: data.title ?? e2eTitle("Chamado de teste"),
      description: data.description ?? "Criado automaticamente pelos testes E2E do frontend.",
      priority: data.priority ?? "MEDIUM",
      categoryId: categories[0].id,
    }),
  });
}

/** `id` e nome de um usuário fixo (`GET /users/me`). */
export async function fixedUserInfo(role: FixedRole): Promise<{ id: string; name: string }> {
  return apiJson("/users/me", { token: await apiToken(role) });
}

/** SUPPORT fixo assume um chamado da fila (corpo vazio). Só para chamados criados pelo teste. */
export async function assumeAsSupport(ticketId: string) {
  await apiJson(`/tickets/${ticketId}/assign`, {
    method: "PATCH",
    token: await apiToken("SUPPORT"),
    body: JSON.stringify({}),
  });
}

/** Muda o status de um chamado de teste pela API, como o papel informado. */
export async function setStatusAs(role: FixedRole, ticketId: string, status: string) {
  await apiJson(`/tickets/${ticketId}/status`, {
    method: "PATCH",
    token: await apiToken(role),
    body: JSON.stringify({ status }),
  });
}

/** Cria um comentário num chamado de teste pela API, como o papel informado. */
export async function commentAs(role: FixedRole, ticketId: string, body: string, isInternal = false) {
  await apiJson(`/tickets/${ticketId}/comments`, {
    method: "POST",
    token: await apiToken(role),
    body: JSON.stringify(isInternal ? { body, isInternal: true } : { body }),
  });
}

type ApiComment = { id: string; body: string; isInternal: boolean; author: { name: string; role: string } };

/** Comentários de um chamado de teste (até 100), como o papel informado os vê. */
export async function listCommentsAs(role: FixedRole, ticketId: string) {
  const page = await apiJson<{ data: ApiComment[]; total: number }>(
    `/tickets/${ticketId}/comments?limit=100`,
    { token: await apiToken(role) },
  );
  return page.data;
}

/** ADMIN fixo atribui (ou reatribui) um chamado de teste a um atendente. */
export async function assignAsAdmin(ticketId: string, assigneeId: string) {
  await apiJson(`/tickets/${ticketId}/assign`, {
    method: "PATCH",
    token: await apiToken("ADMIN"),
    body: JSON.stringify({ assigneeId }),
  });
}

/**
 * Cria um atendente (SUPPORT) descartável via `POST /users/staff`, como o
 * admin fixo. E-mail único: usuários não podem ser excluídos.
 */
export async function createDisposableSupport(tag = "support") {
  const user = { name: `E2E ${tag}`, email: uniqueEmail(tag), password: PASSWORD, role: "SUPPORT" };
  const created = await apiJson<{ id: string; name: string }>("/users/staff", {
    method: "POST",
    token: await apiToken("ADMIN"),
    body: JSON.stringify(user),
  });
  return { ...user, id: created.id };
}

/**
 * Cria uma categoria descartável como o admin fixo. Sem `name`, usa um nome
 * com prefixo único; com `name`, ele deve ter o prefixo `[e2e-...]` do teste.
 */
export async function createCategoryAsAdmin(name?: string): Promise<{ id: string; name: string }> {
  const token = await apiToken("ADMIN");
  return apiJson("/categories", {
    method: "POST",
    token,
    body: JSON.stringify({ name: (name ?? e2eTitle("Categoria")).slice(0, 60) }),
  });
}

/** Ativa ou desativa uma categoria (não existe exclusão na API). */
export async function setCategoryActive(id: string, active: boolean) {
  const token = await apiToken("ADMIN");
  await apiJson(`/categories/${id}`, { method: "PATCH", token, body: JSON.stringify({ active }) });
}

type ApiCategory = { id: string; name: string; active?: boolean };

/** Categorias como o papel as vê (`ADMIN`: todas com `active`; demais: só as ativas). */
export async function listCategoriesAs(role: FixedRole): Promise<ApiCategory[]> {
  return apiJson("/categories", { token: await apiToken(role) });
}

/** Categorias (visão do admin fixo) cujo nome começa com `prefix` (ex.: o `[e2e-...]` do teste). */
export async function findCategoriesByPrefix(prefix: string): Promise<ApiCategory[]> {
  return (await listCategoriesAs("ADMIN")).filter((c) => c.name.startsWith(prefix));
}

/**
 * Limpeza: desativa (via API, admin fixo) toda categoria ativa cujo nome
 * começa com `prefix`. Categorias não podem ser excluídas; inativas não
 * aparecem no select dos clientes. Nunca passe um prefixo que case com as
 * categorias reais.
 */
export async function deactivateCategoriesByPrefix(prefix: string) {
  if (!prefix.startsWith("[e2e-")) throw new Error(`Prefixo de limpeza inseguro: ${prefix}`);
  for (const category of await findCategoriesByPrefix(prefix)) {
    if (category.active !== false) await setCategoryActive(category.id, false);
  }
}

/** Garante que o administrador veja pelo menos `min` chamados, criando os que faltarem. */
export async function ensureTicketCount(min: number) {
  const token = await apiToken("ADMIN");
  const { total } = await apiJson<{ total: number }>("/tickets?limit=1", { token });
  for (let i = total; i < min; i += 1) {
    await createTicketAsCustomer({ title: e2eTitle("Paginação") });
  }
}

/** Cria um usuário CUSTOMER descartável direto na API (POST /users). */
export async function createDisposableUser(tag = "user") {
  const user = { name: `E2E ${tag}`, email: uniqueEmail(tag), password: PASSWORD };
  const response = await fetch(apiUrl("/users"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  if (response.status !== 201) {
    throw new Error(`Falha ao criar usuário descartável: ${response.status}`);
  }
  return user;
}

export type ApiUser = { id: string; name: string; email: string; role: string; createdAt: string };

/** Usuários por página em `/usuarios` (`USERS_PAGE_SIZE` do app). */
export const USERS_PAGE_SIZE = 25;

/**
 * Acha um usuário pelo e-mail percorrendo `GET /users` (100 por página) com o
 * token do ADMIN fixo, e devolve a página de 25 em que ele aparece em
 * `/usuarios`. A lista vem dos mais antigos para os mais recentes, então a
 * posição de um usuário existente não muda quando outros testes criam
 * usuários. Nunca dependa do total nem da última página.
 */
export async function findUserPage(email: string): Promise<{ user: ApiUser; page: number }> {
  const token = await apiToken("ADMIN");
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 200; page += 1) {
    const result = await apiJson<{ data: ApiUser[]; total: number }>(`/users?page=${page}&limit=100`, { token });
    const index = result.data.findIndex((u) => u.email === target);
    if (index >= 0) {
      const position = (page - 1) * 100 + index;
      return { user: result.data[index], page: Math.floor(position / USERS_PAGE_SIZE) + 1 };
    }
    if (result.data.length === 0 || page * 100 >= result.total) break;
  }
  throw new Error(`Usuário ${email} não encontrado em GET /users.`);
}

/** Usuários cujo e-mail é exatamente `email` (0 ou 1), lidos via `GET /users`. */
export async function countUsersByEmail(email: string): Promise<number> {
  try {
    await findUserPage(email);
    return 1;
  } catch {
    return 0;
  }
}

type FixedRole = "ADMIN" | "SUPPORT" | "CUSTOMER";

/**
 * Credenciais dos usuários fixos (somente .env.e2e). Se faltarem, o teste é
 * marcado como pulado com o motivo explícito no relatório.
 */
export function fixedUser(role: FixedRole) {
  const email = process.env[`E2E_${role}_EMAIL`];
  const password = process.env[`E2E_${role}_PASSWORD`];
  test.skip(
    !email || !password,
    `Defina E2E_${role}_EMAIL e E2E_${role}_PASSWORD no .env.e2e para rodar este teste.`,
  );
  return { email: email!, password: password! };
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

export async function loginAndWait(page: Page, email: string, password: string) {
  await login(page, email, password);
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function signup(
  page: Page,
  data: { name: string; email: string; password: string; confirmPassword?: string },
) {
  await page.goto("/cadastro");
  await page.getByLabel("Nome").fill(data.name);
  await page.getByLabel("E-mail").fill(data.email);
  await page.getByLabel("Senha", { exact: true }).fill(data.password);
  await page.getByLabel("Confirmar senha").fill(data.confirmPassword ?? data.password);
  await page.getByRole("button", { name: "Criar conta" }).click();
}

export async function sessionCookies(context: BrowserContext) {
  const cookies = await context.cookies();
  return {
    access: cookies.find((c) => c.name === "td_access"),
    refresh: cookies.find((c) => c.name === "td_refresh"),
  };
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
}

/**
 * Região da moldura com a navegação e a área do usuário: a sidebar a partir
 * de md, ou o drawer (aberto por "Abrir menu") no mobile.
 */
export async function openShell(page: Page) {
  const menu = page.getByRole("button", { name: "Abrir menu" });
  if (await menu.isVisible()) {
    await menu.click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    return drawer;
  }
  return page.locator("aside");
}

/** Confere o papel exibido na área do usuário (sidebar ou drawer). */
export async function expectRole(page: Page, label: string) {
  const shell = await openShell(page);
  await expect(shell.locator('[data-slot="user-role"]')).toHaveText(label);
  return shell;
}

/** Clica em "Sair" (no mobile, abre o drawer antes). */
export async function logout(page: Page) {
  const shell = await openShell(page);
  await shell.getByRole("button", { name: "Sair" }).click();
}
