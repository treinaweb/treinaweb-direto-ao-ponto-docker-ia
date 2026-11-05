import { expect, test } from "@playwright/test";
import {
  createDisposableUser,
  decodeJwtPayload,
  loginAndWait,
  logout,
  sessionCookies,
} from "./support";

// Testes de sessão: sempre com usuários descartáveis (nunca os fixos).

test.describe("Manter a sessão ativa", () => {
  test("access token traz exp de ~15 min e o cookie expira junto", async ({ page, context }) => {
    const user = await createDisposableUser("exp");
    await loginAndWait(page, user.email, user.password);

    const { access, refresh } = await sessionCookies(context);
    const payload = decodeJwtPayload(access!.value);
    expect(typeof payload.exp).toBe("number");

    const now = Date.now() / 1000;
    const ttl = (payload.exp as number) - now;
    expect(ttl).toBeGreaterThan(14 * 60);
    expect(ttl).toBeLessThanOrEqual(15 * 60 + 5);
    expect(Math.abs(access!.expires - (payload.exp as number))).toBeLessThan(5);
    // Refresh: 7 dias deslizantes.
    expect(refresh!.expires - now).toBeGreaterThan(7 * 24 * 3600 - 60);
  });

  test("sem access token → renova no proxy e mostra a página", async ({ page, context }) => {
    const user = await createDisposableUser("renew");
    await loginAndWait(page, user.email, user.password);
    const before = await sessionCookies(context);

    await context.clearCookies({ name: "td_access" });
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: `Olá, ${user.name}` })).toBeVisible();
    const after = await sessionCookies(context);
    expect(after.access?.value).toBeTruthy();
    expect(after.refresh?.value).not.toBe(before.refresh!.value);
  });

  test("requisições paralelas com o mesmo refresh não revogam a sessão", async ({
    page,
    context,
  }) => {
    const user = await createDisposableUser("parallel");
    await loginAndWait(page, user.email, user.password);
    await context.clearCookies({ name: "td_access" });

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        page.request.get("/dashboard", { maxRedirects: 0 }),
      ),
    );
    for (const response of responses) {
      expect(response.status()).toBe(200);
    }

    // A sessão segue válida (uma revogação por reuso mandaria ao login).
    await context.clearCookies({ name: "td_access" });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: `Olá, ${user.name}` })).toBeVisible();
  });
});

test.describe("Sessão encerrada", () => {
  test("refresh antigo não renova após o logout", async ({ page, context }) => {
    const user = await createDisposableUser("revoked");
    await loginAndWait(page, user.email, user.password);
    const { refresh } = await sessionCookies(context);

    await logout(page);
    await expect(page).toHaveURL(/\/login\?aviso=logout$/);
    await expect(page.getByText("Você saiu da sua conta.")).toBeVisible();
    expect((await sessionCookies(context)).refresh).toBeUndefined();

    // Restaura só o refresh revogado: o proxy tenta renovar e a API recusa.
    await context.addCookies([{ ...refresh!, expires: refresh!.expires }]);
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard&aviso=sessao-expirada$/);
    await expect(page.getByText("Sua sessão expirou. Entre novamente.")).toBeVisible();
    expect((await sessionCookies(context)).refresh).toBeUndefined();
  });

  test("voltar no navegador após sair não reabre o dashboard", async ({ page }) => {
    const user = await createDisposableUser("back");
    await page.goto("/login");
    await loginAndWait(page, user.email, user.password);

    await logout(page);
    await expect(page).toHaveURL(/\/login\?aviso=logout$/);

    await page.goBack();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  });
});
