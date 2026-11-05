import "server-only";

import { apiFetch } from "./client";
import type { LoginDto, TokenPair } from "./types";

/** `POST /auth/login` → 200 par de tokens | 400 | 401 credenciais inválidas. */
export function login(credentials: LoginDto): Promise<TokenPair> {
  return apiFetch<TokenPair>("/auth/login", { method: "POST", body: credentials });
}

/**
 * `POST /auth/refresh` → 200 novo par | 400 | 401.
 * O refresh token enviado deixa de valer. Não chame direto: use
 * `refreshSingleFlight` de `lib/auth/refresh.ts`.
 */
export function refresh(refreshToken: string): Promise<TokenPair> {
  return apiFetch<TokenPair>("/auth/refresh", { method: "POST", body: { refreshToken } });
}

/** `POST /auth/logout` (autenticado) → 204 | 400 | 401. */
export function logout(accessToken: string, refreshToken: string): Promise<void> {
  return apiFetch<void>("/auth/logout", {
    method: "POST",
    accessToken,
    body: { refreshToken },
  });
}
