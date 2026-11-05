import { describe, expect, it } from "vitest";
import {
  CATEGORY_MESSAGES,
  categoryNameSchema,
  createCategorySchema,
  renameCategorySchema,
  toggleCategorySchema,
} from "@/lib/validation/categories";

const ID = "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11";
const LENGTH = "O nome deve ter entre 2 e 60 caracteres.";

function messagesOf(value: unknown) {
  const result = categoryNameSchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe("categoryNameSchema", () => {
  it("mensagem pt-BR", () => {
    expect(CATEGORY_MESSAGES.nameLength).toBe(LENGTH);
  });

  it.each([
    ["a".repeat(1), false],
    ["a".repeat(2), true],
    ["a".repeat(60), true],
    ["a".repeat(61), false],
  ])("%j → válido? %s", (name, ok) => {
    expect(categoryNameSchema.safeParse(name).success).toBe(ok);
    if (!ok) expect(messagesOf(name)).toEqual([LENGTH]);
  });

  it("limites contam depois do trim", () => {
    expect(categoryNameSchema.parse(`   ${"a".repeat(60)}   `)).toHaveLength(60);
    expect(messagesOf("  A  ")).toEqual([LENGTH]);
    expect(messagesOf(` ${"a".repeat(61)} `)).toEqual([LENGTH]);
  });

  it.each(["", "     ", "\t\n "])("só espaços %j → mensagem de tamanho", (name) => {
    expect(messagesOf(name)).toEqual([LENGTH]);
  });

  it("remove os espaços das extremidades e mantém a caixa", () => {
    expect(categoryNameSchema.parse("  ACESSO e Senhas  ")).toBe("ACESSO e Senhas");
  });

  it("sem regra de unicidade ou de caixa", () => {
    expect(createCategorySchema.parse({ name: "Acesso" })).toEqual({ name: "Acesso" });
    expect(createCategorySchema.parse({ name: "ACESSO" })).toEqual({ name: "ACESSO" });
  });
});

describe("renameCategorySchema", () => {
  it("aceita id UUID, nome com trim e nome atual", () => {
    expect(
      renameCategorySchema.parse({ categoryId: ID, name: " Rede ", currentName: "Redes" }),
    ).toEqual({ categoryId: ID, name: "Rede", currentName: "Redes" });
  });

  it("id inválido → erro em categoryId", () => {
    const result = renameCategorySchema.safeParse({ categoryId: "abc", name: "Rede", currentName: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toEqual(["categoryId"]);
  });

  it("nome curto → mensagem pt-BR em name", () => {
    const result = renameCategorySchema.safeParse({ categoryId: ID, name: "A", currentName: "Rede" });
    expect(result.error?.issues.map((i) => [i.path[0], i.message])).toEqual([["name", LENGTH]]);
  });
});

describe("toggleCategorySchema", () => {
  it.each([
    [`activate:${ID}`, { categoryId: ID, active: true }],
    [`deactivate:${ID}`, { categoryId: ID, active: false }],
  ])("%s → %j", (intent, expected) => {
    expect(toggleCategorySchema.parse(intent)).toEqual(expected);
  });

  it.each([
    "",
    "activate",
    "activate:",
    "activate:abc",
    `remove:${ID}`,
    `delete:${ID}`,
    `activate:${ID}:x`,
    ID,
  ])("intent inválido %j → falha", (intent) => {
    expect(toggleCategorySchema.safeParse(intent).success).toBe(false);
  });
});
