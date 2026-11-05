import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACCESS_COOKIE,
  ACCESS_FALLBACK_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  accessMaxAge,
  clearSession,
  readSession,
  writeSession,
} from "@/lib/auth/cookies";
import { readExp, secondsUntilExpiry } from "@/lib/auth/jwt";
import { fakeJwt, jwtExpiringIn, memoryCookies } from "./helpers";

const NOW = Date.UTC(2026, 9, 13, 12, 0, 0);

afterEach(() => vi.unstubAllEnvs());

describe("readExp", () => {
  it("lê o exp de um JWT válido", () => {
    expect(readExp(fakeJwt({ exp: 1_800_000_000 }))).toBe(1_800_000_000);
  });

  it("retorna null sem exp", () => {
    expect(readExp(fakeJwt({ sub: "x" }))).toBeNull();
  });

  it.each(["", "abc", "a.b.c", "a.%%%.c", `x.${Buffer.from("[1]").toString("base64url")}.y`])(
    "retorna null para token malformado (%s)",
    (token) => {
      expect(readExp(token)).toBeNull();
    },
  );

  it("secondsUntilExpiry calcula o tempo restante", () => {
    expect(secondsUntilExpiry(jwtExpiringIn(90, NOW), NOW)).toBe(90);
    expect(secondsUntilExpiry(jwtExpiringIn(-5, NOW), NOW)).toBe(-5);
  });
});

describe("cookies de sessão", () => {
  it("maxAge do access segue o exp do JWT", () => {
    expect(accessMaxAge(jwtExpiringIn(900, NOW), NOW)).toBe(900);
  });

  it("maxAge do access cai para 15 min sem exp", () => {
    expect(accessMaxAge("nao-e-jwt", NOW)).toBe(ACCESS_FALLBACK_MAX_AGE);
  });

  it("maxAge nunca é negativo", () => {
    expect(accessMaxAge(jwtExpiringIn(-30, NOW), NOW)).toBe(0);
  });

  it("writeSession grava os dois cookies httpOnly com as validades corretas", () => {
    const store = memoryCookies();
    const access = jwtExpiringIn(900, NOW);
    writeSession(store, { accessToken: access, refreshToken: "r1" }, NOW);

    expect(store.sets).toEqual([
      {
        name: ACCESS_COOKIE,
        value: access,
        options: { httpOnly: true, sameSite: "lax", path: "/", secure: false, maxAge: 900 },
      },
      {
        name: REFRESH_COOKIE,
        value: "r1",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: false,
          maxAge: REFRESH_MAX_AGE,
        },
      },
    ]);
  });

  it("secure só em produção", () => {
    vi.stubEnv("NODE_ENV", "production");
    const store = memoryCookies();
    writeSession(store, { accessToken: "a", refreshToken: "r" }, NOW);
    expect(store.sets.every((s) => s.options?.secure === true)).toBe(true);
  });

  it("clearSession expira os dois cookies", () => {
    const store = memoryCookies({ [ACCESS_COOKIE]: "a", [REFRESH_COOKIE]: "r" });
    clearSession(store);
    expect(store.sets.map((s) => [s.name, s.value, s.options?.maxAge])).toEqual([
      [ACCESS_COOKIE, "", 0],
      [REFRESH_COOKIE, "", 0],
    ]);
    expect(readSession(store)).toEqual({ accessToken: undefined, refreshToken: undefined });
  });

  it("readSession ignora cookies vazios", () => {
    const store = memoryCookies({ [ACCESS_COOKIE]: "", [REFRESH_COOKIE]: "r" });
    expect(readSession(store)).toEqual({ accessToken: undefined, refreshToken: "r" });
  });
});
