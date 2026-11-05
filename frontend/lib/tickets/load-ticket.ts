import "server-only";

import { notFound } from "next/navigation";
import { isApiError } from "@/lib/api/errors";
import { getTicket } from "@/lib/api/tickets";
import type { Ticket } from "@/lib/api/types";
import { loadPanel, type PanelResult } from "@/lib/dashboard/load-panel";

/**
 * Carrega um chamado para o detalhe:
 * - 404 (inexistente ou fora da visibilidade) e 400 (id malformado) → "não
 *   encontrado", sem diferenciar os casos;
 * - 401 → login com aviso de sessão expirada (via `loadPanel`);
 * - rede, 5xx e demais falhas → `{ ok: false }` para a página exibir o erro.
 */
export async function loadTicket(accessToken: string, id: string): Promise<PanelResult<Ticket>> {
  let missing = false;
  const result = await loadPanel(async () => {
    try {
      return await getTicket(accessToken, id);
    } catch (error) {
      if (isApiError(error) && (error.status === 404 || error.status === 400)) {
        missing = true;
        return null;
      }
      throw error;
    }
  });

  // Fora do try/catch: `notFound()` lança um sinal de controle do Next.
  if (missing) notFound();
  return result as PanelResult<Ticket>;
}
