/** Gera um JWT de teste (assinatura falsa) com o payload informado. */
export function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.assinatura`;
}

/** JWT que expira em `seconds` segundos a partir de `now`. */
export function jwtExpiringIn(seconds: number, now = Date.now()): string {
  return fakeJwt({ sub: "user-1", exp: Math.floor(now / 1000) + seconds });
}

/** Armazenamento de cookies em memória com a interface de `cookies()`. */
export function memoryCookies(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const sets: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];
  return {
    values,
    sets,
    get(name: string) {
      const value = values.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set(name: string, value: string, options?: Record<string, unknown>) {
      sets.push({ name, value, options });
      if (options?.maxAge === 0) values.delete(name);
      else values.set(name, value);
    },
    delete(name: string) {
      values.delete(name);
    },
  };
}
