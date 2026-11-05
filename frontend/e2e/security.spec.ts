import { expect, test } from "@playwright/test";
import { createDisposableUser, loginAndWait, logout, sessionCookies } from "./support";

test("navegador nunca chama a API e tokens não aparecem no HTML", async ({ page, context }) => {
  const apiOrigin = new URL(process.env.API_BASE_URL!).origin;
  const apiCalls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin === apiOrigin) apiCalls.push(request.url());
  });

  const user = await createDisposableUser("security");
  await loginAndWait(page, user.email, user.password);
  await expect(page.getByRole("heading", { name: `Olá, ${user.name}` })).toBeVisible();

  const { access, refresh } = await sessionCookies(context);
  expect(access?.httpOnly).toBe(true);
  expect(refresh?.httpOnly).toBe(true);
  expect(access?.sameSite).toBe("Lax");
  expect(refresh?.sameSite).toBe("Lax");

  const html = await page.content();
  expect(html).not.toContain(access!.value);
  expect(html).not.toContain(refresh!.value);
  expect(html).not.toContain(apiOrigin);
  expect(await page.evaluate(() => document.cookie)).not.toContain("td_");

  await page.reload();
  await logout(page);
  await expect(page).toHaveURL(/\/login\?aviso=logout$/);

  expect(apiCalls).toEqual([]);
});
