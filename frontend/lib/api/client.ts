import "server-only";

import { getApiBaseUrl } from "@/lib/env";
import { ApiError, NETWORK_ERROR_STATUS } from "./errors";

type ApiFetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  accessToken?: string;
  /** Tempo máximo de espera pela API, em ms. */
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Único ponto de chamada HTTP à API TreinaDesk. Só roda no servidor.
 * Retorna o JSON (ou `undefined` em 204) e lança `ApiError` em qualquer falha.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", body, accessToken, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ApiError(NETWORK_ERROR_STATUS);
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessages(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    // 2xx com corpo inesperado: trata como falha da API.
    throw new ApiError(502);
  }
}

/** Lê `ErrorResponse.message` (string ou array) de forma tolerante. */
async function readErrorMessages(response: Response): Promise<string[]> {
  try {
    const data: unknown = await response.json();
    if (data && typeof data === "object" && "message" in data) {
      const { message } = data as { message: unknown };
      if (typeof message === "string") return [message];
      if (Array.isArray(message)) {
        return message.filter((m): m is string => typeof m === "string");
      }
    }
  } catch {
    // corpo vazio ou não-JSON
  }
  return [];
}
