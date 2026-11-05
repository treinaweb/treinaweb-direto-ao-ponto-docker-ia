/**
 * Lê a claim `exp` (segundos desde a época) de um JWT, sem verificar a
 * assinatura: serve só para decidir quando renovar. Quem valida o token é a API.
 * Retorna `null` se o token for malformado ou não tiver `exp` numérico.
 */
export function readExp(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
    if (json && typeof json === "object" && "exp" in json) {
      const { exp } = json as { exp: unknown };
      if (typeof exp === "number" && Number.isFinite(exp)) return exp;
    }
  } catch {
    // payload inválido
  }
  return null;
}

/** Segundos até o token expirar (negativo se já expirou); `null` se sem `exp`. */
export function secondsUntilExpiry(token: string, now = Date.now()): number | null {
  const exp = readExp(token);
  return exp === null ? null : exp - Math.floor(now / 1000);
}
