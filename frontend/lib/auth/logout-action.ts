"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logout } from "@/lib/api/auth";
import { clearSession, readSession } from "./cookies";
import { loginUrl } from "./notices";

/**
 * Sair: revoga o refresh token na API e apaga os cookies MESMO se a API
 * falhar (401, 5xx, rede). O proxy já renovou o access token neste POST,
 * se preciso.
 */
export async function logoutAction(): Promise<void> {
  const store = await cookies();
  const { accessToken, refreshToken } = readSession(store);

  if (accessToken && refreshToken) {
    try {
      await logout(accessToken, refreshToken);
    } catch {
      // Sessão local é encerrada de qualquer forma.
    }
  }

  clearSession(store);
  redirect(loginUrl({ notice: "logout" }));
}
