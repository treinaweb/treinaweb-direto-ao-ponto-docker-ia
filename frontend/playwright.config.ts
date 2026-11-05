import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Credenciais e URL da API ficam só no .env.e2e (não versionado).
if (existsSync(".env.e2e")) {
  process.loadEnvFile(".env.e2e");
}

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  // A API real faz hash de senha a cada cadastro/login; muitos workers
  // simultâneos (mais o `next dev` compilando) deixam as respostas lentas.
  workers: process.env.CI ? 2 : 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      API_BASE_URL: process.env.API_BASE_URL ?? "",
    },
  },
});
