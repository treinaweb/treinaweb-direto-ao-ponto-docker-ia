import { expect, test, type Page } from "@playwright/test";
import {
  apiToken,
  apiUrl,
  createCategoryAsAdmin,
  e2eTitle,
  fixedUser,
  loginAndWait,
  setCategoryActive,
} from "./support";

const DESCRIPTION = "Descrição criada pelo teste E2E de abertura de chamado.";

async function openForm(page: Page) {
  const user = fixedUser("CUSTOMER");
  await loginAndWait(page, user.email, user.password);
  await page.goto("/chamados/novo");
  await expect(page.getByLabel("Título")).toBeVisible();
}

/** Primeira categoria disponível no select (o cliente só recebe as ativas). */
async function pickFirstCategory(page: Page) {
  const select = page.getByLabel("Categoria");
  const value = await select.locator("option:not([value=''])").first().getAttribute("value");
  await select.selectOption(value!);
}

test.describe("Abrir chamado", () => {
  test("erros de validação aparecem nos campos e nada é criado", async ({ page }) => {
    await openForm(page);
    await expect(page.getByLabel("Prioridade")).toHaveValue("MEDIUM");

    await page.getByLabel("Título").fill("Erro");
    await page.getByLabel("Descrição").fill(DESCRIPTION);
    await page.getByLabel("Prioridade").selectOption("LOW");
    await page.getByRole("button", { name: "Abrir chamado" }).click();

    await expect(page.getByText("O título deve ter entre 5 e 120 caracteres.")).toBeVisible();
    await expect(page.getByLabel("Prioridade")).toHaveValue("LOW");
    await expect(page.getByText("Selecione uma categoria.")).toBeVisible();
    await expect(page).toHaveURL(/\/chamados\/novo$/);
    // A descrição longa não se perde no erro.
    await expect(page.getByLabel("Descrição")).toHaveValue(DESCRIPTION);
    await expect(page.getByLabel("Título")).toHaveAttribute("aria-invalid", "true");
  });

  test("cria o chamado e leva ao detalhe com o aviso", async ({ page }) => {
    const title = e2eTitle("Abertura pelo formulário");
    await openForm(page);

    await page.getByLabel("Título").fill(title);
    await page.getByLabel("Descrição").fill(DESCRIPTION);
    await page.getByLabel("Prioridade").selectOption("HIGH");
    await pickFirstCategory(page);
    await page.getByRole("button", { name: "Abrir chamado" }).click();

    await expect(page).toHaveURL(/\/chamados\/[0-9a-f-]{36}\?aviso=chamado-aberto$/);
    await expect(page.getByRole("status").filter({ hasText: "Chamado aberto." })).toBeVisible();
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    // Escopo no cabeçalho do chamado: o Next 16 mantém a página anterior (o formulário) oculta no DOM.
    const header = main.locator("header").filter({ hasText: title });
    await expect(header.getByText("Aberto", { exact: true })).toBeVisible();
    await expect(header.getByText("Alta", { exact: true })).toBeVisible();
    await expect(main.getByRole("region", { name: "Informações do chamado" })).toContainText("Na fila");

    // O chamado novo também aparece na lista (sem exigir a 1ª posição: outros
    // testes em paralelo criam chamados do mesmo cliente ao mesmo tempo).
    await page.goto("/chamados");
    await expect(main.getByRole("link", { name: new RegExp(title.replace(/[[\]]/g, "\\$&")) })).toBeVisible();
  });

  test("duplo clique cria um único chamado", async ({ page }) => {
    const title = e2eTitle("Duplo clique");
    await openForm(page);
    await page.getByLabel("Título").fill(title);
    await page.getByLabel("Descrição").fill(DESCRIPTION);
    await pickFirstCategory(page);
    await page.getByRole("button", { name: "Abrir chamado" }).dblclick();
    await expect(page).toHaveURL(/\/chamados\/[0-9a-f-]{36}\?aviso=chamado-aberto$/);

    const token = await apiToken("CUSTOMER");
    const response = await fetch(apiUrl("/tickets?limit=50"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data } = (await response.json()) as { data: Array<{ title: string }> };
    expect(data.filter((t) => t.title === title)).toHaveLength(1);
  });

  test("aviso desconhecido na URL não é exibido", async ({ page }) => {
    const user = fixedUser("CUSTOMER");
    await loginAndWait(page, user.email, user.password);
    await page.goto("/chamados?aviso=%3Cb%3Eoi%3C%2Fb%3E");
    await expect(page.getByRole("heading", { name: "Meus chamados", level: 1 })).toBeVisible();
    await expect(page.getByText("<b>oi</b>")).toHaveCount(0);
    await expect(page.getByText("Chamado aberto.")).toHaveCount(0);
  });

  test("Cancelar volta à lista", async ({ page }) => {
    await openForm(page);
    await page.getByRole("link", { name: "Cancelar" }).click();
    await expect(page).toHaveURL(/\/chamados$/);
  });

  for (const role of ["SUPPORT", "ADMIN"] as const) {
    test(`${role} recebe não encontrado em /chamados/novo`, async ({ page }) => {
      const user = fixedUser(role);
      await loginAndWait(page, user.email, user.password);
      await page.goto("/chamados/novo");
      await expect(page.getByRole("heading", { name: "Página não encontrada", level: 1 })).toBeVisible();
      await expect(page.getByLabel("Título")).toHaveCount(0);
    });
  }

  test("categoria desativada durante o preenchimento → 422 tratado", async ({ page }) => {
    const category = await createCategoryAsAdmin();
    const title = e2eTitle("Categoria desativada");
    try {
      await openForm(page);
      await page.getByLabel("Título").fill(title);
      await page.getByLabel("Descrição").fill(DESCRIPTION);
      await page.getByLabel("Prioridade").selectOption("URGENT");
      await page.getByLabel("Categoria").selectOption({ label: category.name });

      await setCategoryActive(category.id, false);
      await page.getByRole("button", { name: "Abrir chamado" }).click();

      await expect(
        page.getByText("Esta categoria não está mais disponível. Escolha outra."),
      ).toBeVisible();
      await expect(page.getByLabel("Categoria").locator("option", { hasText: category.name })).toHaveCount(0);
      await expect(page.getByLabel("Categoria")).toHaveValue("");
      await expect(page.getByLabel("Título")).toHaveValue(title);
      await expect(page.getByLabel("Descrição")).toHaveValue(DESCRIPTION);
      await expect(page.getByLabel("Prioridade")).toHaveValue("URGENT");
    } finally {
      await setCategoryActive(category.id, false);
    }
  });

  test("sem scroll horizontal em 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openForm(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const box = await page.getByRole("button", { name: "Abrir chamado" }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
