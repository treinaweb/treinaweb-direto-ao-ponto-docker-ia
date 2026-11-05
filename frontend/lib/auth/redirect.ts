import { isGuestRoute } from "./routes";

export const DEFAULT_AFTER_LOGIN = "/dashboard";

/**
 * Valida o destino pós-login (`?next=`): aceita só caminhos internos.
 * Evita open redirect (`//host`, `/\host`, URLs absolutas) e loops para
 * as próprias telas de login/cadastro.
 */
export function safeNext(next: unknown, fallback = DEFAULT_AFTER_LOGIN): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 2048) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  // Caracteres de controle/espaço podem ser normalizados pelo navegador em "//".
  if (/[\u0000-\u001f\u007f\s\\]/.test(next)) return fallback;

  let url: URL;
  try {
    url = new URL(next, "http://treinadesk.local");
  } catch {
    return fallback;
  }
  if (url.origin !== "http://treinadesk.local") return fallback;
  if (isGuestRoute(url.pathname)) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}
