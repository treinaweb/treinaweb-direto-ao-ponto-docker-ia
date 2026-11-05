import "server-only";

/** Status 0 representa falha de rede (API inacessível ou sem resposta). */
export const NETWORK_ERROR_STATUS = 0;

export class ApiError extends Error {
  readonly status: number;
  /** Mensagens originais da API (podem estar em inglês; nunca exibir direto). */
  readonly messages: string[];

  constructor(status: number, messages: string[] = []) {
    super(`API respondeu ${status === NETWORK_ERROR_STATUS ? "com falha de rede" : status}`);
    this.name = "ApiError";
    this.status = status;
    this.messages = messages;
  }

  get isNetworkError() {
    return this.status === NETWORK_ERROR_STATUS;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export const MESSAGES = {
  generic: "Não foi possível conectar ao servidor. Tente novamente em instantes.",
  forbidden: "Você não tem permissão para esta ação.",
  notFound: "Não encontramos o que você procurava.",
  conflict: "Os dados foram alterados por outra pessoa. Recarregue e tente novamente.",
  invalidData: "Verifique os dados informados.",
  unauthorized: "Sua sessão expirou. Entre novamente.",
  businessRule: "Não foi possível concluir a ação.",
} as const;

/**
 * Traduções das mensagens conhecidas da API (regras de negócio, 422 etc.).
 * Mensagens fora deste mapa caem no texto genérico do status.
 */
const KNOWN_MESSAGES: Record<string, string> = {
  "Credenciais inválidas": "E-mail ou senha inválidos.",
  // 422 de `PATCH /users/{id}/role` no próprio usuário (já vem em pt-BR, sem ponto final).
  "Não é permitido alterar o próprio papel": "Não é permitido alterar o próprio papel.",
};

/**
 * Mensagem pt-BR para exibir ao usuário a partir de um erro qualquer.
 * Segue a tabela da seção 4 de docs/frontend-guidelines.md.
 */
export function toUserMessage(error: unknown): string {
  if (!isApiError(error) || error.isNetworkError || error.status >= 500) {
    return MESSAGES.generic;
  }

  const known = error.messages.map((m) => KNOWN_MESSAGES[m]).find(Boolean);
  if (known) return known;

  switch (error.status) {
    case 400:
      return MESSAGES.invalidData;
    case 401:
      return MESSAGES.unauthorized;
    case 403:
      return MESSAGES.forbidden;
    case 404:
      return MESSAGES.notFound;
    case 409:
      return MESSAGES.conflict;
    case 422:
      return MESSAGES.businessRule;
    default:
      return MESSAGES.generic;
  }
}

export type ValidationRule =
  | "required"
  | "email"
  | "minLength"
  | "maxLength"
  | "type"
  | "unknown";

export type ValidationIssue = { field: string; rule: ValidationRule };

const RULE_PATTERNS: Array<[RegExp, ValidationRule]> = [
  [/ should not be empty$/, "required"],
  [/ must be an email$/, "email"],
  [/ must be longer than or equal to \d+ characters$/, "minLength"],
  [/ must be shorter than or equal to \d+ characters$/, "maxLength"],
  [/ must be a (string|number|boolean)$/, "type"],
];

/** Quando um campo tem várias violações, mostra a mais relevante. */
const RULE_PRIORITY: ValidationRule[] = [
  "required",
  "email",
  "minLength",
  "maxLength",
  "type",
  "unknown",
];

/**
 * Interpreta as mensagens 400 da API (class-validator, em inglês,
 * ex.: "email must be an email") como pares campo/regra, para que cada
 * formulário exiba a sua própria mensagem pt-BR. Uma issue por campo.
 */
export function parseValidationMessages(messages: string[]): ValidationIssue[] {
  const byField = new Map<string, ValidationRule>();

  for (const message of messages) {
    const field = message.split(" ", 1)[0];
    if (!field) continue;

    const rule = RULE_PATTERNS.find(([pattern]) => pattern.test(message))?.[1] ?? "unknown";
    const current = byField.get(field);
    if (!current || RULE_PRIORITY.indexOf(rule) < RULE_PRIORITY.indexOf(current)) {
      byField.set(field, rule);
    }
  }

  return [...byField].map(([field, rule]) => ({ field, rule }));
}
