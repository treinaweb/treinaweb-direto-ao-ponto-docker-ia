import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isApiError } from "@/lib/api/errors";
import { clearSession, readSession, writeSession } from "./cookies";
import { loginUrl } from "./notices";
import { refreshSingleFlight } from "./refresh";

function isUnauthorized(error: unknown) {
  return isApiError(error) && error.status === 401;
}

async function endSession(): Promise<never> {
  clearSession(await cookies());
  redirect(loginUrl({ notice: "sessao-expirada" }));
}

/**
 * Executa uma chamada autenticada dentro de uma Server Action (ou Route
 * Handler). Verifica a sessão antes de chamar a API e, se a API responder 401,
 * renova os tokens UMA vez (single-flight), grava os cookies novos e repete a
 * chamada UMA vez. Se não houver sessão ou a renovação falhar, apaga os
 * cookies e redireciona para o login.
 */
export async function withSession<T>(call: (accessToken: string) => Promise<T>): Promise<T> {
  const store = await cookies();
  const { accessToken, refreshToken } = readSession(store);

  if (!accessToken && !refreshToken) {
    redirect("/login");
  }

  if (accessToken) {
    try {
      return await call(accessToken);
    } catch (error) {
      if (!isUnauthorized(error)) throw error;
    }
  }

  if (!refreshToken) return endSession();

  let tokens;
  try {
    tokens = await refreshSingleFlight(refreshToken);
  } catch (error) {
    if (isUnauthorized(error)) return endSession();
    throw error;
  }
  writeSession(store, tokens);

  try {
    return await call(tokens.accessToken);
  } catch (error) {
    if (isUnauthorized(error)) return endSession();
    throw error;
  }
}
