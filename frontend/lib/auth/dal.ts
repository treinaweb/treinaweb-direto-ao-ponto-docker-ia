import "server-only";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { isApiError } from "@/lib/api/errors";
import type { Role } from "@/lib/api/types";
import { getMe } from "@/lib/api/users";
import { readSession } from "./cookies";
import { loginUrl } from "./notices";

/**
 * DTO enxuto do usuário logado: nunca tokens nem o objeto bruto da API. O `id`
 * só é usado no servidor (ex.: saber se é o dono ou o atendente de um chamado);
 * os Client Components recebem apenas `name` e `role`.
 */
export type CurrentUser = { id: string; name: string; role: Role };

/**
 * Data Access Layer: usuário logado, a partir de `GET /users/me`.
 * Para Server Components: em 401 redireciona para o login e NUNCA renova
 * tokens (Server Components não gravam cookies; a renovação é do proxy).
 * Memorizado por renderização com React `cache`.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const { accessToken } = readSession(await cookies());
  if (!accessToken) {
    redirect(loginUrl({ notice: "sessao-expirada" }));
  }

  try {
    const user = await getMe(accessToken);
    return { id: user.id, name: user.name, role: user.role };
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      // O proxy apaga os cookies ao ver este aviso, evitando loop login↔dashboard.
      redirect(loginUrl({ notice: "sessao-expirada" }));
    }
    throw error;
  }
});

/**
 * Access token da sessão para leituras em Server Components. Sem token,
 * vai ao login (a renovação é sempre do proxy, nunca da renderização).
 */
export async function getAccessToken(): Promise<string> {
  const { accessToken } = readSession(await cookies());
  if (!accessToken) {
    redirect(loginUrl({ notice: "sessao-expirada" }));
  }
  return accessToken;
}

/**
 * Exige um dos papéis informados. Papel sem acesso recebe a página
 * "não encontrado", sem revelar que a rota existe (mesma semântica da API).
 */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!roles.includes(user.role)) {
    notFound();
  }
  return user;
}
