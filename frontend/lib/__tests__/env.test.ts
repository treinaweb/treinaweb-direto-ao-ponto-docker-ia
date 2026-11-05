import { afterEach, describe, expect, it, vi } from "vitest";
import { getApiBaseUrl, resetApiBaseUrlCache } from "@/lib/env";

afterEach(() => resetApiBaseUrlCache());

describe("getApiBaseUrl", () => {
  it("retorna a URL sem barra final", () => {
    vi.stubEnv("API_BASE_URL", "http://localhost:3000/");
    expect(getApiBaseUrl()).toBe("http://localhost:3000");
  });

  it("falha com mensagem pt-BR quando ausente", () => {
    vi.stubEnv("API_BASE_URL", "");
    expect(() => getApiBaseUrl()).toThrow("API_BASE_URL não definida");
  });

  it("falha com mensagem pt-BR quando inválida", () => {
    vi.stubEnv("API_BASE_URL", "localhost:3000");
    expect(() => getApiBaseUrl()).toThrow("URL http(s) válida");
  });
});
