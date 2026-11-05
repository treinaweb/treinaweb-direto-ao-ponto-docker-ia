import { expect, test } from "@playwright/test";
import {
  PASSWORD,
  createDisposableUser,
  expectRole,
  loginAndWait,
  logout,
  signup,
  uniqueEmail,
} from "./support";

test.describe("Criar conta", () => {
  test("cadastro com e-mail novo → dashboard logado como Cliente", async ({ page, context }) => {
    const name = "Ana E2E";
    await signup(page, { name, email: uniqueEmail("signup"), password: PASSWORD });

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: `Olá, ${name}` })).toBeVisible();
    await expectRole(page, "Cliente");
    const names = (await context.cookies()).map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(["td_access", "td_refresh"]));
  });

  test("e-mail duplicado → erro no campo, dados mantidos e link para entrar", async ({ page }) => {
    const existing = await createDisposableUser("dup");
    await signup(page, { name: "Outra Pessoa", email: existing.email, password: PASSWORD });

    await expect(page.getByText("Este e-mail já está cadastrado.")).toBeVisible();
    await expect(page.getByLabel("Nome")).toHaveValue("Outra Pessoa");
    await expect(page.getByLabel("E-mail")).toHaveValue(existing.email);
    await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("");
    await expect(page.getByRole("link", { name: "Entrar com este e-mail" })).toBeVisible();
    await expect(page).toHaveURL(/\/cadastro$/);
  });

  test("senha curta e confirmação diferente → erros sem criar conta", async ({ page }) => {
    const email = uniqueEmail("invalid");
    await signup(page, { name: "Ana", email, password: "1234567" });
    await expect(page.getByText("A senha deve ter entre 8 e 128 caracteres.")).toBeVisible();

    await signup(page, { name: "Ana", email, password: PASSWORD, confirmPassword: "outraSenha1" });
    await expect(page.getByText("As senhas não conferem.")).toBeVisible();

    // A conta não foi criada: o mesmo e-mail ainda está livre.
    await signup(page, { name: "Ana", email, password: PASSWORD });
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("nome curto e e-mail inválido → mensagens pt-BR", async ({ page }) => {
    await signup(page, { name: "A", email: "ana.teste.com", password: PASSWORD });
    await expect(page.getByText("O nome deve ter entre 2 e 100 caracteres.")).toBeVisible();
    await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
  });

  test("e-mail com maiúsculas e espaços é normalizado", async ({ page }) => {
    const email = uniqueEmail("case");
    await signup(page, { name: "Caso", email: `  ${email.toUpperCase()} `, password: PASSWORD });
    await expect(page).toHaveURL(/\/dashboard$/);

    await logout(page);
    await expect(page).toHaveURL(/\/login/);
    await loginAndWait(page, email, PASSWORD);
  });

  test("botão fica desabilitado no envio (sem cadastro duplicado)", async ({ page }) => {
    await page.goto("/cadastro");
    await page.getByLabel("Nome").fill("Duplo Clique");
    await page.getByLabel("E-mail").fill(uniqueEmail("dbl"));
    await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirmar senha").fill(PASSWORD);

    let posts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().includes("/cadastro")) posts++;
    });
    await page.getByRole("button", { name: "Criar conta" }).dblclick();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(posts).toBe(1);
  });

  test("campos com pelo menos 44px e sem scroll horizontal", async ({ page }) => {
    await page.goto("/cadastro");
    for (const label of ["Nome", "E-mail", "Confirmar senha"]) {
      const box = await page.getByLabel(label).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    const box = await page.getByRole("button", { name: "Criar conta" }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });
});
