import "server-only";

import { createHash } from "node:crypto";
import { refresh } from "@/lib/api/auth";
import { isApiError } from "@/lib/api/errors";
import type { TokenPair } from "@/lib/api/types";

/**
 * Renovação single-flight (docs/frontend-guidelines.md, seção 3).
 *
 * A API rotaciona o refresh token a cada uso e revoga TODAS as sessões do
 * usuário se um token já usado for reenviado (inclusive em requisições
 * concorrentes). Por isso cada refresh token é enviado no máximo uma vez:
 * chamadas concorrentes recebem a mesma promessa, e o resultado (sucesso ou
 * 401) fica reaproveitável por uma janela curta, para requisições que chegam
 * logo depois ainda com o cookie antigo.
 *
 * Limitação: o mapa vale para um único processo do servidor. Com várias
 * instâncias seria preciso um lock externo (ex.: Redis).
 */

export const REUSE_WINDOW_MS = 10_000;

type Entry = { promise: Promise<TokenPair>; settledAt?: number };

// Em globalThis para que o proxy e as Server Actions (bundles diferentes no
// mesmo processo Node) compartilhem o mesmo mapa.
const STORE_KEY = Symbol.for("treinadesk.refresh-single-flight");
type GlobalWithStore = typeof globalThis & { [STORE_KEY]?: Map<string, Entry> };

function getStore(): Map<string, Entry> {
  const g = globalThis as GlobalWithStore;
  g[STORE_KEY] ??= new Map();
  return g[STORE_KEY];
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function prune(store: Map<string, Entry>, now: number) {
  for (const [key, entry] of store) {
    if (entry.settledAt !== undefined && now - entry.settledAt >= REUSE_WINDOW_MS) {
      store.delete(key);
    }
  }
}

export function refreshSingleFlight(refreshToken: string): Promise<TokenPair> {
  const store = getStore();
  const now = Date.now();
  prune(store, now);

  const key = hashToken(refreshToken);
  const existing = store.get(key);
  if (existing) return existing.promise;

  const entry: Entry = { promise: refresh(refreshToken) };
  store.set(key, entry);

  entry.promise.then(
    () => {
      entry.settledAt = Date.now();
    },
    (error: unknown) => {
      if (isApiError(error) && (error.isNetworkError || error.status >= 500)) {
        // Falha transitória: permite nova tentativa com o mesmo token.
        store.delete(key);
      } else {
        entry.settledAt = Date.now();
      }
    },
  );

  return entry.promise;
}

/** Só para testes. */
export function resetRefreshStore() {
  getStore().clear();
}
