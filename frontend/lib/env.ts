import "server-only";

import { z } from "zod";

const apiBaseUrlSchema = z.url({
  protocol: /^https?$/,
  error: "API_BASE_URL deve ser uma URL http(s) válida, ex.: http://localhost:3000.",
});

let cached: string | undefined;

/**
 * URL base da API TreinaDesk. Variável só de servidor (nunca `NEXT_PUBLIC_*`).
 * É lida sob demanda para não quebrar o build quando a variável não existe.
 */
export function getApiBaseUrl(): string {
  if (cached) return cached;

  const raw = process.env.API_BASE_URL;
  if (!raw) {
    throw new Error("API_BASE_URL não definida. Configure-a no .env.local (veja .env.example).");
  }

  const result = apiBaseUrlSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(result.error.issues[0].message);
  }

  cached = result.data.replace(/\/+$/, "");
  return cached;
}

/** Só para testes: descarta o valor memorizado. */
export function resetApiBaseUrlCache() {
  cached = undefined;
}
