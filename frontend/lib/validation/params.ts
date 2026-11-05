import { z } from "zod";

/** IDs da API são sempre UUID; um id malformado vira "não encontrado" na UI. */
export const ticketIdSchema = z.uuid({ message: "Identificador de chamado inválido." });

export function parseTicketId(value: unknown): string | null {
  const result = ticketIdSchema.safeParse(value);
  return result.success ? result.data : null;
}
