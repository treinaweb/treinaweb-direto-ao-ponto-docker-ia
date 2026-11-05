import { expect, test, type Page } from "@playwright/test";
import { fixedUser, loginAndWait } from "./support";

const NOT_FOUND = "Página não encontrada";

async function expectNotFound(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: NOT_FOUND, level: 1 })).toBeVisible();
  // O nome da página vetada não aparece em lugar nenhum (nem no breadcrumb).
  await expect(page.getByRole("navigation", { name: "Você está em" })).not.toContainText(
    /Categorias|Usuários|Novo usuário|Abrir chamado/,
  );
}

test.describe("Acesso às páginas por papel", () => {
  test("cliente não abre Usuários, Novo usuário nem Categorias", async ({ page }) => {
    const user = fixedUser("CUSTOMER");
    await loginAndWait(page, user.email, user.password);
    await expectNotFound(page, "/usuarios");
    await expectNotFound(page, "/usuarios/novo");
    await expectNotFound(page, "/categorias");
  });

  test("atendente não abre Categorias, Usuários, Novo usuário nem Abrir chamado", async ({ page }) => {
    const user = fixedUser("SUPPORT");
    await loginAndWait(page, user.email, user.password);
    await expectNotFound(page, "/categorias");
    await expectNotFound(page, "/usuarios");
    await expectNotFound(page, "/usuarios/novo");
    await expectNotFound(page, "/chamados/novo");
  });

  test("administrador não abre Abrir chamado", async ({ page }) => {
    const user = fixedUser("ADMIN");
    await loginAndWait(page, user.email, user.password);
    await expectNotFound(page, "/chamados/novo");
  });

  test("administrador abre Categorias e Usuários dentro da moldura", async ({ page, isMobile }) => {
    const user = fixedUser("ADMIN");
    await loginAndWait(page, user.email, user.password);

    for (const title of ["Categorias", "Usuários"]) {
      await page.goto(title === "Categorias" ? "/categorias" : "/usuarios");
      const main = page.getByRole("main");
      await expect(main.getByRole("heading", { name: title, level: 1 })).toBeVisible();
      if (title === "Categorias") {
        // Já construída: administração de categorias, não mais página "em breve".
        await expect(main.getByRole("button", { name: "Nova categoria", exact: true })).toBeVisible();
        await expect(main.getByText("Esta página estará disponível em breve.")).toHaveCount(0);
      } else {
        // Já construída: lista real de usuários, não mais página "em breve".
        await expect(main.getByRole("link", { name: "Novo usuário" })).toBeVisible();
        await expect(main.getByRole("list", { name: "Usuários", exact: true }).getByRole("listitem").first()).toBeVisible();
        await expect(main.getByText("Esta página estará disponível em breve.")).toHaveCount(0);
      }

      const crumbs = page.getByRole("navigation", { name: "Você está em" });
      await expect(crumbs.locator('[aria-current="page"]')).toHaveText(title);
      if (isMobile) {
        // No mobile só a página atual fica visível.
        await expect(crumbs.getByRole("link", { name: "Painel" })).toBeHidden();
      } else {
        await expect(crumbs.getByRole("link", { name: "Painel" })).toHaveAttribute("href", "/dashboard");
        await expect(crumbs.locator('[aria-current="page"]')).toHaveText(title);
      }
    }
  });

  test("cliente vê Meus chamados e Abrir chamado já construídos", async ({ page }) => {
    const user = fixedUser("CUSTOMER");
    await loginAndWait(page, user.email, user.password);

    await page.goto("/chamados");
    await expect(page.getByRole("heading", { name: "Meus chamados", level: 1 })).toBeVisible();
    // A lista já foi construída: não é mais página "em breve".
    await expect(page.getByRole("form", { name: "Filtrar chamados" })).toBeVisible();
    await expect(page.getByText("Esta página estará disponível em breve.")).toHaveCount(0);
    await page.goto("/chamados/novo");
    await expect(page.getByRole("heading", { name: "Abrir chamado", level: 1 })).toBeVisible();
    await expect(page.getByLabel("Título")).toBeVisible();
    await expect(page.getByText("Esta página estará disponível em breve.")).toHaveCount(0);
  });

  test("identificador de chamado inválido → não encontrado", async ({ page }) => {
    const user = fixedUser("SUPPORT");
    await loginAndWait(page, user.email, user.password);

    // Id inválido e chamado inexistente caem na mesma tela (sem diferenciar os casos).
    for (const path of ["/chamados/abc", "/chamados/2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Chamado não encontrado.", level: 1 })).toBeVisible();
      await expect(page.getByRole("link", { name: "Voltar aos chamados" })).toBeVisible();
    }
  });
});
