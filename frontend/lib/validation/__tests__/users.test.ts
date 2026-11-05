import { describe, expect, it } from "vitest";
import { AUTH_MESSAGES } from "@/lib/validation/auth";
import { toFieldErrors } from "@/lib/validation/form";
import {
  USER_MESSAGES,
  changeRoleSchema,
  createStaffSchema,
  parseUserListQuery,
} from "@/lib/validation/users";

const valid = {
  name: "Bruno Atendente",
  email: "bruno@teste.com",
  password: "senhaSegura123",
  role: "SUPPORT",
};

function errorsFor(input: Record<string, unknown>) {
  const result = createStaffSchema.safeParse({ ...valid, ...input });
  return result.success ? {} : toFieldErrors(result.error);
}

describe("createStaffSchema", () => {
  it("aceita dados válidos", () => {
    expect(createStaffSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    ["", USER_MESSAGES.nameRequired],
    ["   ", USER_MESSAGES.nameRequired],
    ["A", USER_MESSAGES.nameLength],
    [" A ", USER_MESSAGES.nameLength],
    ["A".repeat(101), USER_MESSAGES.nameLength],
  ])("nome %j → %s", (name, message) => {
    expect(errorsFor({ name })).toEqual({ name: message });
  });

  it.each([["Ab"], ["A".repeat(100)], [`  ${"A".repeat(100)}  `]])("nome %j no limite é aceito", (name) => {
    expect(createStaffSchema.safeParse({ ...valid, name }).success).toBe(true);
  });

  it("nome com trim", () => {
    expect(createStaffSchema.parse({ ...valid, name: "  Bruno  " }).name).toBe("Bruno");
  });

  it("e-mail normalizado (trim e minúsculas)", () => {
    expect(createStaffSchema.parse({ ...valid, email: "  Bruno@Teste.COM " }).email).toBe("bruno@teste.com");
  });

  it.each([
    ["", USER_MESSAGES.emailRequired],
    ["bruno.teste.com", USER_MESSAGES.emailInvalid],
    [`${"a".repeat(194)}@t.com`.padEnd(201, "m"), USER_MESSAGES.emailTooLong],
  ])("e-mail %j → %s", (email, message) => {
    expect(errorsFor({ email })).toEqual({ email: message });
  });

  it("e-mail com 200 caracteres é aceito; 201 não", () => {
    const at200 = `${"a".repeat(194)}@t.com`;
    expect(at200).toHaveLength(200);
    expect(createStaffSchema.safeParse({ ...valid, email: at200 }).success).toBe(true);
    expect(errorsFor({ email: `a${at200}` })).toEqual({ email: USER_MESSAGES.emailTooLong });
  });

  it.each([
    ["", USER_MESSAGES.passwordRequired],
    ["1234567", USER_MESSAGES.passwordLength],
    ["x".repeat(129), USER_MESSAGES.passwordLength],
  ])("senha %j → %s", (password, message) => {
    expect(errorsFor({ password })).toEqual({ password: message });
  });

  it.each([["12345678"], ["x".repeat(128)]])("senha no limite (%#) é aceita", (password) => {
    expect(createStaffSchema.safeParse({ ...valid, password }).success).toBe(true);
  });

  it.each([[""], ["CUSTOMER"], ["support"], [undefined]])("papel %j → Selecione o papel.", (role) => {
    expect(errorsFor({ role })).toEqual({ role: "Selecione o papel." });
  });

  it("aceita ADMIN", () => {
    expect(createStaffSchema.parse({ ...valid, role: "ADMIN" }).role).toBe("ADMIN");
  });

  it("reaproveita os textos do cadastro público onde servem", () => {
    expect(USER_MESSAGES.nameLength).toBe(AUTH_MESSAGES.nameLength);
    expect(USER_MESSAGES.emailInvalid).toBe(AUTH_MESSAGES.emailInvalid);
    expect(USER_MESSAGES.passwordLength).toBe(AUTH_MESSAGES.passwordLength);
    expect(AUTH_MESSAGES.emailTaken).toBe("Este e-mail já está cadastrado.");
  });
});

describe("changeRoleSchema", () => {
  const userId = "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11";

  it.each([["CUSTOMER"], ["SUPPORT"], ["ADMIN"]])("aceita o papel %s", (role) => {
    expect(changeRoleSchema.parse({ userId, role })).toEqual({ userId, role });
  });

  it.each([
    [{ userId: "abc", role: "SUPPORT" }],
    [{ userId: "", role: "SUPPORT" }],
    [{ userId, role: "support" }],
    [{ userId, role: "ROOT" }],
    [{ userId, role: "" }],
  ])("recusa %j", (input) => {
    expect(changeRoleSchema.safeParse(input).success).toBe(false);
  });
});

describe("parseUserListQuery", () => {
  it.each([
    [{}, 1],
    [{ page: "2" }, 2],
    [{ page: "abc" }, 1],
    [{ page: "-1" }, 1],
    [{ page: "0" }, 1],
    [{ page: "1.5" }, 1],
    [{ page: ["3", "4"] }, 3],
    [{ page: "2", aviso: "usuario-cadastrado", outra: "x" }, 2],
  ])("%j → página %i", (params, page) => {
    expect(parseUserListQuery(params)).toEqual({ page });
  });
});
