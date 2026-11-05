import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  apiUrl,
  createCategoryAsAdmin,
  deactivateCategoriesByPrefix,
  e2eTitle,
  findCategoriesByPrefix,
  fixedUser,
  listCategoriesAs,
  loginAndWait,
  setCategoryActive,
} from "./support";

/*
 * Administração de categorias contra a API real, com o admin fixo. Cada teste
 * usa um prefixo `[e2e-...]` próprio; tudo o que ele cria é desativado no
 * `afterEach` (categorias não podem ser excluídas). Nenhum teste depende do
 * total nem da posição global da lista: outros testes criam categorias ao
 * mesmo tempo.
 */

let prefix: string;

test.beforeEach(() => {
  prefix = e2eTitle("").trim();
});

test.afterEach(async () => {
  await deactivateCategoriesByPrefix(prefix);
});

/** Nome único do teste, limitado a 60 caracteres. */
function nameOf(text: string) {
  return `${prefix} ${text}`.slice(0, 60);
}

async function openPage(page: Page) {
  const admin = fixedUser("ADMIN");
  await loginAndWait(page, admin.email, admin.password);
  await page.goto("/categorias");
  const main = page.getByRole("main");
  await expect(main.getByRole("button", { name: "Nova categoria", exact: true })).toBeVisible();
  return main;
}

/** Item da lista pelo nome exato (nunca pela posição). */
function item(main: Locator, name: string) {
  return main.getByRole("listitem").filter({ has: main.page().getByText(name, { exact: true }) });
}

function status(page: Page, text: string) {
  return page.getByRole("status").filter({ hasText: text });
}

async function openCreate(page: Page, main: Locator) {
  await main.getByRole("button", { name: "Nova categoria", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Nova categoria" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("Administração de categorias", () => {
  test("cria pela tela, sem os espaços das extremidades, e devolve o foco", async ({ page }) => {
    const name = nameOf("Criada pela tela");
    const main = await openPage(page);

    const dialog = await openCreate(page, main);
    const field = dialog.getByLabel("Nome");
    await expect(field).toBeFocused();
    await expect(field).toHaveValue("");
    await field.fill(`   ${name}   `);
    await dialog.getByRole("button", { name: "Criar", exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(status(page, "Categoria criada.")).toBeVisible();
    const row = item(main, name);
    await expect(row).toHaveCount(1);
    await expect(row.getByText("Ativa", { exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: `Desativar ${name}`, exact: true })).toBeVisible();
    await expect(main.getByRole("button", { name: "Nova categoria", exact: true })).toBeFocused();

    const created = await findCategoriesByPrefix(prefix);
    expect(created.map((c) => [c.name, c.active])).toEqual([[name, true]]);
  });

  test("nome duplicado: erro no campo, valor preservado e reabertura limpa", async ({ page }) => {
    const name = nameOf("Duplicada");
    await createCategoryAsAdmin(name);
    const main = await openPage(page);

    const dialog = await openCreate(page, main);
    const field = dialog.getByLabel("Nome");
    await field.fill(`${name} `);
    await dialog.getByRole("button", { name: "Criar", exact: true }).click();

    await expect(dialog.getByText("Já existe uma categoria com esse nome.")).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(field).toHaveValue(`${name} `);
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toBeFocused();

    // Cancelar e abrir de novo: campo vazio e sem o erro anterior. A lista não mudou
    // (conferida com o diálogo fechado: aberto, o resto da página fica inerte).
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(item(main, name)).toHaveCount(1);
    const again = await openCreate(page, main);
    await expect(again.getByLabel("Nome")).toHaveValue("");
    await expect(again.getByText("Já existe uma categoria com esse nome.")).toHaveCount(0);
    await again.getByRole("button", { name: "Cancelar", exact: true }).click();

    expect(await findCategoriesByPrefix(prefix)).toHaveLength(1);
  });

  test("nome curto não cria nada e mantém o diálogo aberto", async ({ page }) => {
    const main = await openPage(page);
    const dialog = await openCreate(page, main);
    await dialog.getByLabel("Nome").fill(" A ");
    await dialog.getByRole("button", { name: "Criar", exact: true }).click();

    await expect(dialog.getByText("O nome deve ter entre 2 e 60 caracteres.")).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Nome")).toHaveValue(" A ");
    await expect(status(page, "Categoria criada.")).toHaveCount(0);
  });

  test("renomeia mantendo o estado; Esc fecha sem salvar e devolve o foco", async ({ page }) => {
    const name = nameOf("Original");
    const renamed = nameOf("Renomeada");
    await createCategoryAsAdmin(name);
    const main = await openPage(page);

    // Esc: fecha sem salvar e o foco volta ao "Renomear <nome>".
    const trigger = main.getByRole("button", { name: `Renomear ${name}`, exact: true });
    await trigger.click();
    let dialog = page.getByRole("dialog", { name: "Renomear categoria" });
    await expect(dialog.getByLabel("Nome")).toHaveValue(name);
    await expect(dialog.getByLabel("Nome")).toBeFocused();
    await dialog.getByLabel("Nome").fill(renamed);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(item(main, name)).toHaveCount(1);
    expect((await findCategoriesByPrefix(prefix)).map((c) => c.name)).toEqual([name]);

    // Salvar: anuncia, mostra o nome novo com o mesmo estado e devolve o foco.
    await trigger.click();
    dialog = page.getByRole("dialog", { name: "Renomear categoria" });
    await dialog.getByLabel("Nome").fill(renamed);
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(status(page, "Categoria renomeada.")).toBeVisible();
    const row = item(main, renamed);
    await expect(row.getByText("Ativa", { exact: true })).toBeVisible();
    await expect(item(main, name)).toHaveCount(0);
    await expect(main.getByRole("button", { name: `Renomear ${renamed}`, exact: true })).toBeFocused();
    expect((await findCategoriesByPrefix(prefix)).map((c) => [c.name, c.active])).toEqual([[renamed, true]]);
  });

  test("desativa sem confirmação, some para o cliente e reativa", async ({ page }) => {
    const name = nameOf("Liga e desliga");
    const created = await createCategoryAsAdmin(name);
    // BFF: nenhuma requisição sai do navegador para a API.
    const apiOrigin = new URL(apiUrl("/")).origin;
    const browserToApi: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).origin === apiOrigin) browserToApi.push(request.url());
    });
    const main = await openPage(page);
    const row = item(main, name);

    await row.getByRole("button", { name: `Desativar ${name}`, exact: true }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(status(page, "Categoria desativada.")).toBeVisible();
    await expect(row.getByText("Inativa", { exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: `Ativar ${name}`, exact: true })).toBeVisible();

    // O cliente fixo não recebe mais a categoria (some do "Abrir chamado").
    const forCustomer = await listCategoriesAs("CUSTOMER");
    expect(forCustomer.map((c) => c.id)).not.toContain(created.id);

    await row.getByRole("button", { name: `Ativar ${name}`, exact: true }).click();
    await expect(status(page, "Categoria ativada.")).toBeVisible();
    // A mensagem anterior foi substituída.
    await expect(status(page, "Categoria desativada.")).toHaveCount(0);
    await expect(row.getByText("Ativa", { exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: `Desativar ${name}`, exact: true })).toBeVisible();
    expect(browserToApi).toEqual([]);
  });

  test("renomeia uma categoria inativa sem reativá-la", async ({ page }) => {
    const name = nameOf("Inativa antes");
    const renamed = nameOf("Inativa depois");
    const created = await createCategoryAsAdmin(name);
    await setCategoryActive(created.id, false);
    const main = await openPage(page);

    await main.getByRole("button", { name: `Renomear ${name}`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Renomear categoria" });
    await dialog.getByLabel("Nome").fill(renamed);
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();

    await expect(status(page, "Categoria renomeada.")).toBeVisible();
    await expect(item(main, renamed).getByText("Inativa", { exact: true })).toBeVisible();
  });

  test("duplo clique em Criar gera uma única categoria", async ({ page }) => {
    const name = nameOf("Duplo clique");
    const main = await openPage(page);
    const dialog = await openCreate(page, main);
    await dialog.getByLabel("Nome").fill(name);
    await dialog.getByRole("button", { name: "Criar", exact: true }).dblclick();

    await expect(status(page, "Categoria criada.")).toBeVisible();
    await expect(item(main, name)).toHaveCount(1);
    expect(await findCategoriesByPrefix(prefix)).toHaveLength(1);
  });

  test("não oferece Excluir em nenhum item", async ({ page }) => {
    await createCategoryAsAdmin(nameOf("Sem remover"));
    const main = await openPage(page);
    await expect(item(main, nameOf("Sem remover"))).toHaveCount(1);
    await expect(main.getByRole("button", { name: /^excluir/i })).toHaveCount(0);
    // Nenhum texto "Excluir" fora dos nomes das categorias (que vêm da API).
    await expect(main.getByText(/^excluir/i)).toHaveCount(0);
    await expect(
      main.getByText(
        "Categorias inativas não aparecem para quem abre chamados. Os chamados que já usam a categoria continuam com ela.",
      ),
    ).toBeVisible();
  });

  test("360px: sem scroll horizontal, nome longo quebra e botões com 44px", async ({ page }) => {
    // Nome de 60 caracteres sem espaços depois do prefixo: precisa quebrar.
    const name = `${prefix} ${"X".repeat(60)}`.slice(0, 60);
    await createCategoryAsAdmin(name);
    await page.setViewportSize({ width: 360, height: 800 });
    const main = await openPage(page);
    const row = item(main, name);
    await expect(row).toHaveCount(1);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(360);

    const buttons = [
      main.getByRole("button", { name: "Nova categoria", exact: true }),
      row.getByRole("button", { name: `Renomear ${name}`, exact: true }),
      row.getByRole("button", { name: `Desativar ${name}`, exact: true }),
    ];
    for (const button of buttons) {
      const box = await button.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x + box!.width).toBeLessThanOrEqual(360);
    }

    // Diálogo cabe na largura, com campo e botões de 44px.
    const dialog = await openCreate(page, main);
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(360);
    for (const control of [
      dialog.getByLabel("Nome"),
      dialog.getByRole("button", { name: "Criar", exact: true }),
      dialog.getByRole("button", { name: "Cancelar", exact: true }),
    ]) {
      // Espera a animação de abertura (zoom) terminar antes de medir.
      await expect.poll(async () => (await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  });
});
