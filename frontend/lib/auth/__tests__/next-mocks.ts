import { vi } from "vitest";
import { memoryCookies } from "./helpers";

/**
 * Estado compartilhado pelos mocks de `next/headers` e `next/navigation`.
 * Use com:
 *   vi.mock("next/headers", () => nextHeadersMock);
 *   vi.mock("next/navigation", () => nextNavigationMock);
 */
export const nextState = { cookies: memoryCookies() };

export function resetNextState(initial: Record<string, string> = {}) {
  nextState.cookies = memoryCookies(initial);
}

export class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(`REDIRECT ${url}`);
  }
}

export class NotFoundSignal extends Error {
  constructor() {
    super("NOT_FOUND");
  }
}

export const nextHeadersMock = {
  cookies: vi.fn(async () => nextState.cookies),
};

export const nextNavigationMock = {
  redirect: vi.fn((url: string) => {
    throw new RedirectSignal(url);
  }),
  notFound: vi.fn(() => {
    throw new NotFoundSignal();
  }),
  /** Como no Next: relança só os sinais de controle (redirect/notFound). */
  unstable_rethrow: vi.fn((error: unknown) => {
    if (error instanceof RedirectSignal || error instanceof NotFoundSignal) throw error;
  }),
};

/** Executa e devolve a URL do redirect lançado (ou falha se não houver). */
export async function captureRedirect(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof RedirectSignal) return error.url;
    throw error;
  }
  throw new Error("esperava redirect");
}
