import { describe, expect, it } from "vitest";
import type { PublicUser } from "@/lib/api/types";
import { USERS_PAGE_SIZE, buildUsersHref, lastPageFor, toUserRow } from "@/lib/users/list";
import { USER_NOTICES, getUserNotice, withUserNotice } from "@/lib/users/notices";
import { isDemotionToCustomer, rolesOfferedFor } from "@/lib/users/roles";

describe("buildUsersHref", () => {
  it("página 1 fica implícita", () => {
    expect(buildUsersHref()).toBe("/usuarios");
    expect(buildUsersHref(1)).toBe("/usuarios");
  });

  it("demais páginas vão na query", () => {
    expect(buildUsersHref(2)).toBe("/usuarios?page=2");
    expect(buildUsersHref(20)).toBe("/usuarios?page=20");
  });
});

describe("lastPageFor", () => {
  it("25 por página", () => {
    expect(USERS_PAGE_SIZE).toBe(25);
  });

  it.each([
    [0, 1],
    [1, 1],
    [25, 1],
    [26, 2],
    [490, 20],
  ])("total %i → página %i", (total, page) => {
    expect(lastPageFor(total)).toBe(page);
  });
});

describe("toUserRow", () => {
  const user = {
    id: "u1",
    name: "Bruno",
    email: "bruno@teste.com",
    role: "SUPPORT",
    createdAt: "2026-10-02T22:41:44.837Z",
    // Campos extras de uma API futura não podem vazar para o navegador.
    passwordHash: "x",
  } as PublicUser & { passwordHash: string };

  it("DTO só com os campos da linha", () => {
    expect(toUserRow(user, "outro")).toEqual({
      id: "u1",
      name: "Bruno",
      email: "bruno@teste.com",
      role: "SUPPORT",
      createdAt: "2026-10-02T22:41:44.837Z",
      isSelf: false,
    });
  });

  it("linha do próprio administrador", () => {
    expect(toUserRow(user, "u1").isSelf).toBe(true);
  });
});

describe("rolesOfferedFor", () => {
  it.each([
    ["CUSTOMER", ["SUPPORT", "ADMIN"]],
    ["SUPPORT", ["CUSTOMER", "ADMIN"]],
    ["ADMIN", ["CUSTOMER", "SUPPORT"]],
  ] as const)("%s → %j", (current, offered) => {
    expect(rolesOfferedFor(current)).toEqual(offered);
  });
});

describe("isDemotionToCustomer", () => {
  it.each([
    ["SUPPORT", "CUSTOMER", true],
    ["ADMIN", "CUSTOMER", true],
    ["CUSTOMER", "CUSTOMER", false],
    ["CUSTOMER", "SUPPORT", false],
    ["SUPPORT", "ADMIN", false],
    ["ADMIN", "SUPPORT", false],
    ["SUPPORT", "", false],
  ] as const)("%s → %j: %s", (current, next, expected) => {
    expect(isDemotionToCustomer(current, next)).toBe(expected);
  });
});

describe("getUserNotice / withUserNotice", () => {
  it("aviso conhecido", () => {
    expect(getUserNotice("usuario-cadastrado")).toBe(USER_NOTICES["usuario-cadastrado"]);
    expect(getUserNotice("usuario-cadastrado")).toBe("Usuário cadastrado.");
  });

  it("repetido usa o primeiro", () => {
    expect(getUserNotice(["usuario-cadastrado", "x"])).toBe("Usuário cadastrado.");
    expect(getUserNotice(["x", "usuario-cadastrado"])).toBeNull();
  });

  it.each([["desconhecido"], ["__proto__"], ["constructor"], ["<b>oi</b>"], [undefined], [1], [null], [{}]])(
    "código %j → nenhum aviso",
    (code) => {
      expect(getUserNotice(code)).toBeNull();
    },
  );

  it("acrescenta o aviso à URL", () => {
    expect(withUserNotice("/usuarios", "usuario-cadastrado")).toBe("/usuarios?aviso=usuario-cadastrado");
    expect(withUserNotice("/usuarios?page=3", "usuario-cadastrado")).toBe(
      "/usuarios?page=3&aviso=usuario-cadastrado",
    );
  });
});
