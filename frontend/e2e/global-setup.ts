/**
 * Garante que a API real está acessível antes de rodar os testes E2E.
 * Os testes não usam mocks da API; sem ela, falham com mensagem clara.
 */
export default async function globalSetup() {
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error(
      "API_BASE_URL não definida. Crie o arquivo .env.e2e (veja .env.example).",
    );
  }

  try {
    const response = await fetch(new URL("/docs-json", apiBaseUrl), {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `A API TreinaDesk não respondeu em ${apiBaseUrl} (${String(error)}). ` +
        "Suba a API antes de rodar os testes E2E.",
    );
  }
}
