import "server-only";

import { redirect, unstable_rethrow } from "next/navigation";
import { isApiError } from "@/lib/api/errors";
import { loginUrl } from "@/lib/auth/notices";

export type PanelResult<T> = { ok: true; data: T } | { ok: false };

/**
 * Carrega os dados de um painel do dashboard sem derrubar a página:
 * - 401 → login com aviso de sessão expirada (nunca renova na renderização);
 * - rede, 5xx, 403 e demais falhas → `{ ok: false }`, para o painel exibir o erro;
 * - sinais internos do Next (redirect, notFound, prerender) são relançados.
 */
export async function loadPanel<T>(load: () => Promise<T>): Promise<PanelResult<T>> {
  let sessionRejected = false;
  try {
    return { ok: true, data: await load() };
  } catch (error) {
    unstable_rethrow(error);
    if (isApiError(error) && error.status === 401) {
      sessionRejected = true;
    } else {
      console.error("Falha ao carregar painel do dashboard", error);
    }
  }

  // Fora do try/catch: o redirect lança um erro de controle que não pode ser engolido.
  if (sessionRejected) {
    redirect(loginUrl({ notice: "sessao-expirada" }));
  }
  return { ok: false };
}
