import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api/client";
import { ApiError, NETWORK_ERROR_STATUS } from "@/lib/api/errors";
import { resetApiBaseUrlCache } from "@/lib/env";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  resetApiBaseUrlCache();
  vi.stubEnv("API_BASE_URL", "http://api.test");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function catchError(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error("esperava erro");
}

describe("apiFetch", () => {
  it("monta URL, headers, Bearer e corpo JSON", async () => {
    fetchMock.mockResolvedValue(json(200, { ok: true }));

    const data = await apiFetch("/users/me", {
      method: "POST",
      body: { a: 1 },
      accessToken: "tok",
    });

    expect(data).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/users/me");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe('{"a":1}');
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer tok",
      "Content-Type": "application/json",
    });
  });

  it("não envia Authorization nem Content-Type sem token/corpo", async () => {
    fetchMock.mockResolvedValue(json(200, {}));
    await apiFetch("/x");
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("204 retorna undefined", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiFetch("/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });

  it("400 com message em array", async () => {
    fetchMock.mockResolvedValue(
      json(400, { statusCode: 400, message: ["email must be an email"], error: "Bad Request" }),
    );
    const error = await catchError(apiFetch("/users", { method: "POST", body: {} }));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.messages).toEqual(["email must be an email"]);
  });

  it("401 com message em string e sem 'error'", async () => {
    fetchMock.mockResolvedValue(json(401, { statusCode: 401, message: "Unauthorized" }));
    const error = await catchError(apiFetch("/users/me"));
    expect(error.status).toBe(401);
    expect(error.messages).toEqual(["Unauthorized"]);
  });

  it("5xx sem corpo JSON", async () => {
    fetchMock.mockResolvedValue(new Response("oops", { status: 503 }));
    const error = await catchError(apiFetch("/x"));
    expect(error.status).toBe(503);
    expect(error.messages).toEqual([]);
  });

  it("falha de rede vira ApiError de rede", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const error = await catchError(apiFetch("/x"));
    expect(error.status).toBe(NETWORK_ERROR_STATUS);
    expect(error.isNetworkError).toBe(true);
  });
});
