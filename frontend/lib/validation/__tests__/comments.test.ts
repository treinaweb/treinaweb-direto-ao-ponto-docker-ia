import { describe, expect, it } from "vitest";
import { COMMENT_MESSAGES, commentSchema } from "@/lib/validation/comments";

const TICKET = "2b1f0c39-6b39-4b8a-9d36-2c2a1c0e9d11";

function errorsOf(input: Record<string, unknown>) {
  const result = commentSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message]));
}

describe("commentSchema", () => {
  it.each([
    ["", COMMENT_MESSAGES.required],
    ["    \n\t ", COMMENT_MESSAGES.required],
  ])("corpo %j → Escreva um comentário.", (body, message) => {
    expect(errorsOf({ ticketId: TICKET, body })).toEqual({ body: message });
  });

  it("5000 caracteres depois do trim → aceito", () => {
    const body = `  ${"a".repeat(5000)}  `;
    expect(commentSchema.parse({ ticketId: TICKET, body }).body).toHaveLength(5000);
  });

  it("5001 caracteres depois do trim → limite", () => {
    expect(errorsOf({ ticketId: TICKET, body: ` ${"a".repeat(5001)} ` })).toEqual({
      body: "O comentário deve ter no máximo 5000 caracteres.",
    });
  });

  it("remove os espaços das extremidades", () => {
    expect(commentSchema.parse({ ticketId: TICKET, body: "  Obrigado!  " }).body).toBe("Obrigado!");
  });

  it.each([
    ["on", true],
    [undefined, false],
    ["", false],
  ])("isInternal %j → %s", (isInternal, expected) => {
    expect(commentSchema.parse({ ticketId: TICKET, body: "Oi", isInternal }).isInternal).toBe(expected);
  });

  it.each([[""], ["abc"], ["../x"]])("ticketId %j inválido", (ticketId) => {
    expect(errorsOf({ ticketId, body: "Oi" })).toHaveProperty("ticketId");
  });
});
