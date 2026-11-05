import { expect, test } from "@playwright/test";
import { expectRole, fixedUser, loginAndWait, openShell } from "./support";

const ROLES = [
  {
    role: "CUSTOMER",
    label: "Cliente",
    links: ["Abrir chamado", "Painel", "Meus chamados"],
    absent: ["Categorias", "Usuários", "Chamados"],
  },
  {
    role: "SUPPORT",
    label: "Atendente",
    links: ["Painel", "Chamados"],
    absent: ["Abrir chamado", "Categorias", "Usuários"],
  },
  {
    role: "ADMIN",
    label: "Administrador",
    links: ["Painel", "Chamados", "Categorias", "Usuários"],
    absent: ["Abrir chamado", "Meus chamados"],
  },
] as const;

test.describe("Moldura: navegação por papel", () => {
  for (const { role, label, links, absent } of ROLES) {
    test(`${role} vê só os itens do seu papel`, async ({ page }) => {
      const user = fixedUser(role);
      await loginAndWait(page, user.email, user.password);

      const shell = await openShell(page);
      const nav = shell.getByRole("navigation", { name: "Navegação principal" });
      await expect(nav.getByRole("link")).toHaveText([...links]);
      for (const name of absent) {
        await expect(nav.getByRole("link", { name, exact: true })).toHaveCount(0);
      }
      if (role === "ADMIN") {
        await expect(nav.getByRole("heading", { name: "Administração" })).toBeVisible();
      }
      await expectRole(page, label);
    });
  }

  test("item da página atual tem aria-current e é o único", async ({ page }) => {
    const user = fixedUser("ADMIN");
    await loginAndWait(page, user.email, user.password);

    const nav = (await openShell(page)).getByRole("navigation", { name: "Navegação principal" });
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.getByRole("link", { name: "Painel" })).toHaveAttribute("aria-current", "page");
  });

  test("sem scroll horizontal em 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const user = fixedUser("ADMIN");
    await loginAndWait(page, user.email, user.password);

    await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("Moldura: drawer no mobile", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, "O drawer só existe abaixo de 768px.");
  });

  test("Esc fecha e devolve o foco ao botão Abrir menu", async ({ page }) => {
    const user = fixedUser("CUSTOMER");
    await loginAndWait(page, user.email, user.password);

    const trigger = page.getByRole("button", { name: "Abrir menu" });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("botão Fechar menu fecha o drawer", async ({ page }) => {
    const user = fixedUser("CUSTOMER");
    await loginAndWait(page, user.email, user.password);

    await page.getByRole("button", { name: "Abrir menu" }).click();
    await page.getByRole("button", { name: "Fechar menu" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("escolher um item navega e fecha o drawer", async ({ page }) => {
    const user = fixedUser("CUSTOMER");
    await loginAndWait(page, user.email, user.password);

    await page.getByRole("button", { name: "Abrir menu" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Meus chamados" }).click();
    await expect(page).toHaveURL(/\/chamados$/);
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});
