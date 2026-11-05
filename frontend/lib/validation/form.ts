import type { z } from "zod";

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

/** Converte um ZodError em uma mensagem por campo (a primeira de cada um). */
export function toFieldErrors<K extends string = string>(error: z.ZodError): FieldErrors<K> {
  const result: FieldErrors<K> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue;
    if (!(field in result)) {
      result[field as K] = issue.message;
    }
  }
  return result;
}

type Issue = { field: string; rule: string };

/**
 * Converte as violações 400 da API (já interpretadas por campo/regra) nas
 * mensagens pt-BR do formulário. Retorna `null` se alguma violação não puder
 * ser associada a um campo conhecido (aí o formulário mostra um alerta geral).
 */
export function issuesToFieldErrors<K extends string>(
  issues: Issue[],
  messages: Record<K, Partial<Record<string, string>> & { fallback: string }>,
): FieldErrors<K> | null {
  const result: FieldErrors<K> = {};
  for (const { field, rule } of issues) {
    if (!Object.hasOwn(messages, field)) return null;
    const byRule = messages[field as K];
    result[field as K] = byRule[rule] ?? byRule.fallback;
  }
  return Object.keys(result).length > 0 ? result : null;
}

/** Lê campos de texto do FormData; ausentes ou arquivos viram string vazia. */
export function readFormFields<K extends string>(
  formData: FormData,
  keys: readonly K[],
): Record<K, string> {
  const result = {} as Record<K, string>;
  for (const key of keys) {
    const value = formData.get(key);
    result[key] = typeof value === "string" ? value : "";
  }
  return result;
}
