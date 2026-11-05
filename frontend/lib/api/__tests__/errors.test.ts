import { describe, expect, it } from "vitest";
import {
  ApiError,
  MESSAGES,
  NETWORK_ERROR_STATUS,
  parseValidationMessages,
  toUserMessage,
} from "@/lib/api/errors";

describe("toUserMessage", () => {
  it.each([
    [400, MESSAGES.invalidData],
    [401, MESSAGES.unauthorized],
    [403, "Você não tem permissão para esta ação."],
    [404, MESSAGES.notFound],
    [409, MESSAGES.conflict],
    [422, MESSAGES.businessRule],
    [500, MESSAGES.generic],
    [503, MESSAGES.generic],
    [NETWORK_ERROR_STATUS, MESSAGES.generic],
  ])("status %i → mensagem pt-BR", (status, expected) => {
    expect(toUserMessage(new ApiError(status, ["Some english text"]))).toBe(expected);
  });

  it("traduz mensagem conhecida da API", () => {
    expect(toUserMessage(new ApiError(401, ["Credenciais inválidas"]))).toBe(
      "E-mail ou senha inválidos.",
    );
  });

  it("422 do próprio papel é traduzido; outro 422 cai no texto genérico", () => {
    expect(toUserMessage(new ApiError(422, ["Não é permitido alterar o próprio papel"]))).toBe(
      "Não é permitido alterar o próprio papel.",
    );
    expect(toUserMessage(new ApiError(422, ["Outra regra qualquer"]))).toBe(
      "Não foi possível concluir a ação.",
    );
  });

  it("erro que não é da API vira genérico", () => {
    expect(toUserMessage(new Error("boom"))).toBe(MESSAGES.generic);
  });
});

describe("parseValidationMessages", () => {
  it("interpreta as mensagens reais do POST /users", () => {
    expect(
      parseValidationMessages([
        "name must be longer than or equal to 2 characters",
        "name must be a string",
        "email must be shorter than or equal to 200 characters",
        "email must be an email",
        "password must be longer than or equal to 8 characters",
        "password must be a string",
      ]),
    ).toEqual([
      { field: "name", rule: "minLength" },
      { field: "email", rule: "email" },
      { field: "password", rule: "minLength" },
    ]);
  });

  it("prioriza 'obrigatório' mesmo vindo depois (POST /auth/login com {})", () => {
    expect(
      parseValidationMessages([
        "email should not be empty",
        "email must be a string",
        "password must be shorter than or equal to 128 characters",
        "password should not be empty",
        "password must be a string",
      ]),
    ).toEqual([
      { field: "email", rule: "required" },
      { field: "password", rule: "required" },
    ]);
  });

  it("mensagem desconhecida vira regra 'unknown'", () => {
    expect(parseValidationMessages(["email something new"])).toEqual([
      { field: "email", rule: "unknown" },
    ]);
  });
});
