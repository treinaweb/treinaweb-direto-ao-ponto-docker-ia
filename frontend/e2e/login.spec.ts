import { expect, test } from "@playwright/test";
import { createDisposableUser, expectRole, fixedUser, login, loginAndWait } from "./support";

test.describe("Entrar", () => {
  test("credenciais válidas → dashboard com nome e papel Cliente", async ({ page }) => {
    const user = await createDisposableUser("login");
    await loginAndWait(page, user.email, user.password);

    await expect(page.getByRole("heading", { name: `Olá, ${user.name}` })).toBeVisible();
    const shell = await expectRole(page, "Cliente");
    await expect(shell.getByRole("button", { name: "Sair" })).toBeVisible();
  });

  test("usuário fixo CUSTOMER entra e vê papel Cliente", async ({ page }) => {
    const user = fixedUser("CUSTOMER");
    await loginAndWait(page, user.email, user.password);
    await expectRole(page, "Cliente");
  });

  test("credenciais inválidas → alerta, mantém e-mail e limpa senha", async ({ page, context }) => {
    await login(page, "naoexiste@treinadesk.test", "senhaErrada123");

    await expect(
      page.getByRole("alert").filter({ hasText: "E-mail ou senha inválidos." }),
    ).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveValue("naoexiste@treinadesk.test");
    await expect(page.getByLabel("Senha")).toHaveValue("");
    expect((await context.cookies()).filter((c) => c.name.startsWith("td_"))).toEqual([]);
  });

  test("campos vazios → mensagens pt-BR por campo", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByText("Informe seu e-mail.")).toBeVisible();
    await expect(page.getByText("Informe sua senha.")).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveAttribute("aria-invalid", "true");
  });

  test("e-mail inválido → 'Informe um e-mail válido.'", async ({ page }) => {
    await login(page, "ana@", "qualquer");
    await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
  });

  test("sem sessão em /dashboard → login com next e volta ao destino", async ({ page }) => {
    const user = await createDisposableUser("next");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);

    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("next externo é ignorado", async ({ page }) => {
    const user = await createDisposableUser("next-ext");
    await page.goto("/login?next=https://exemplo.com");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/localhost:\d+\/dashboard$/);
  });

  test("logado em /login, /cadastro ou / → dashboard", async ({ page }) => {
    const user = await createDisposableUser("logged");
    await loginAndWait(page, user.email, user.password);

    for (const path of ["/login", "/cadastro", "/"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard$/);
    }
  });

  test("visitante em / → login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("botão fica desabilitado durante o envio", async ({ page }) => {
    const user = await createDisposableUser("pending");
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);

    let loginPosts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().includes("/login")) loginPosts++;
    });
    const button = page.getByRole("button", { name: "Entrar" });
    await button.dblclick();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(loginPosts).toBe(1);
  });

  test("navegação entre login e cadastro", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Criar conta" }).click();
    await expect(page).toHaveURL(/\/cadastro$/);
    await page.getByRole("link", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("touch targets de pelo menos 44px", async ({ page }) => {
    await page.goto("/login");
    for (const locator of [
      page.getByLabel("E-mail"),
      page.getByLabel("Senha"),
      page.getByRole("button", { name: "Entrar" }),
      page.getByRole("link", { name: "Criar conta" }),
    ]) {
      const box = await locator.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("Papéis de equipe (usuários fixos)", () => {
  test("SUPPORT vê 'Atendente'", async ({ page }) => {
    const user = fixedUser("SUPPORT");
    await loginAndWait(page, user.email, user.password);
    await expectRole(page, "Atendente");
  });

  test("ADMIN vê 'Administrador'", async ({ page }) => {
    const user = fixedUser("ADMIN");
    await loginAndWait(page, user.email, user.password);
    await expectRole(page, "Administrador");
  });
});
