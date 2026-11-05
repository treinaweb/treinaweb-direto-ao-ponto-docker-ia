import type { TokenPair } from "@/lib/api/types";
import { secondsUntilExpiry } from "./jwt";

export const ACCESS_COOKIE = "td_access";
export const REFRESH_COOKIE = "td_refresh";

/** Validade padrão do access token na API (JWT_ACCESS_EXPIRES_IN=15m). */
export const ACCESS_FALLBACK_MAX_AGE = 15 * 60;
/** Validade do refresh token na API (REFRESH_TOKEN_TTL_DAYS=7). */
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

export type CookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  secure: boolean;
  maxAge: number;
};

/** Interface comum a `cookies()` (Server Actions) e `NextResponse.cookies` (proxy). */
export type CookieWriter = {
  set(name: string, value: string, options: CookieOptions): unknown;
};

/** Interface comum a `cookies()` e `NextRequest.cookies`. */
export type CookieReader = {
  get(name: string): { value: string } | undefined;
};

export type SessionTokens = {
  accessToken?: string;
  refreshToken?: string;
};

function options(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

/** maxAge do cookie de access: até o `exp` do JWT, ou 15 min se não der para ler. */
export function accessMaxAge(accessToken: string, now = Date.now()): number {
  const seconds = secondsUntilExpiry(accessToken, now);
  if (seconds === null) return ACCESS_FALLBACK_MAX_AGE;
  return Math.max(0, seconds);
}

export function accessCookieOptions(accessToken: string, now = Date.now()) {
  return options(accessMaxAge(accessToken, now));
}

export function refreshCookieOptions() {
  return options(REFRESH_MAX_AGE);
}

/** Grava o par de tokens (sessão deslizante: o refresh volta a valer 7 dias). */
export function writeSession(store: CookieWriter, tokens: TokenPair, now = Date.now()) {
  store.set(ACCESS_COOKIE, tokens.accessToken, accessCookieOptions(tokens.accessToken, now));
  store.set(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions());
}

/** Apaga os cookies de sessão (mesmas opções de path para o navegador removê-los). */
export function clearSession(store: CookieWriter) {
  store.set(ACCESS_COOKIE, "", options(0));
  store.set(REFRESH_COOKIE, "", options(0));
}

export function readSession(store: CookieReader): SessionTokens {
  return {
    accessToken: store.get(ACCESS_COOKIE)?.value || undefined,
    refreshToken: store.get(REFRESH_COOKIE)?.value || undefined,
  };
}
