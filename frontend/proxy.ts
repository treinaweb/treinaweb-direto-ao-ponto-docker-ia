import { NextResponse, type NextRequest } from "next/server";
import { isApiError } from "@/lib/api/errors";
import type { TokenPair } from "@/lib/api/types";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSession,
  readSession,
  writeSession,
} from "@/lib/auth/cookies";
import { secondsUntilExpiry } from "@/lib/auth/jwt";
import { loginUrl } from "@/lib/auth/notices";
import { DEFAULT_AFTER_LOGIN } from "@/lib/auth/redirect";
import { refreshSingleFlight } from "@/lib/auth/refresh";
import { isGuestRoute, isProtectedRoute } from "@/lib/auth/routes";

/** Renova quando faltar menos que isso para o access token expirar. */
export const REFRESH_MARGIN_SECONDS = 60;

function isUsable(accessToken: string | undefined) {
  if (!accessToken) return false;
  const seconds = secondsUntilExpiry(accessToken);
  return seconds === null || seconds > 0;
}

function needsRefresh(accessToken: string | undefined) {
  if (!accessToken) return true;
  const seconds = secondsUntilExpiry(accessToken);
  return seconds !== null && seconds < REFRESH_MARGIN_SECONDS;
}

type CookieChange = { kind: "renewed"; tokens: TokenPair } | { kind: "cleared" } | null;

/**
 * Proxy (antigo middleware) — docs/frontend-guidelines.md, seção 3.
 * - Refresh preventivo (single-flight) antes de renderizar, gravando os
 *   cookies novos na resposta e na requisição encaminhada.
 * - Redirecionamentos otimistas por presença de sessão. A verificação real
 *   fica no DAL (`getCurrentUser`) e na própria API.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  let { accessToken, refreshToken } = readSession(request.cookies);
  let change: CookieChange = null;
  let sessionExpired = false;

  // O DAL redireciona para cá quando a API recusa a sessão: apaga os cookies
  // locais (Server Components não podem fazê-lo) e mostra o login.
  if (isGuestRoute(pathname) && searchParams.get("aviso") === "sessao-expirada") {
    if (accessToken || refreshToken) {
      change = { kind: "cleared" };
      accessToken = refreshToken = undefined;
    }
  } else if (refreshToken && needsRefresh(accessToken)) {
    try {
      const tokens = await refreshSingleFlight(refreshToken);
      change = { kind: "renewed", tokens };
      ({ accessToken, refreshToken } = tokens);
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        change = { kind: "cleared" };
        sessionExpired = true;
        accessToken = refreshToken = undefined;
      }
      // Falha de rede/5xx: segue sem renovar; a página tratará um eventual 401.
    }
  }

  const hasSession = isUsable(accessToken);

  let redirectTo: string | null = null;
  if (pathname === "/") {
    redirectTo = hasSession ? DEFAULT_AFTER_LOGIN : "/login";
  } else if (isProtectedRoute(pathname) && !hasSession) {
    redirectTo = loginUrl({
      next: `${pathname}${search}`,
      notice: sessionExpired ? "sessao-expirada" : undefined,
    });
  } else if (isGuestRoute(pathname) && hasSession) {
    redirectTo = DEFAULT_AFTER_LOGIN;
  }

  if (redirectTo) {
    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    applyToResponse(response, change);
    return response;
  }

  // Encaminha a requisição já com os cookies novos para a renderização.
  if (change?.kind === "renewed") {
    request.cookies.set(ACCESS_COOKIE, change.tokens.accessToken);
    request.cookies.set(REFRESH_COOKIE, change.tokens.refreshToken);
  } else if (change?.kind === "cleared") {
    request.cookies.delete(ACCESS_COOKIE);
    request.cookies.delete(REFRESH_COOKIE);
  }

  const response = NextResponse.next({ request: { headers: request.headers } });
  applyToResponse(response, change);
  return response;
}

function applyToResponse(response: NextResponse, change: CookieChange) {
  if (change?.kind === "renewed") writeSession(response.cookies, change.tokens);
  if (change?.kind === "cleared") clearSession(response.cookies);
}

export const config = {
  // Tudo, exceto assets do Next, favicon e arquivos com extensão (public/).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
