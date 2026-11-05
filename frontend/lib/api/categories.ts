import "server-only";

import { apiFetch } from "./client";
import type { Category, CreateCategoryDto, UpdateCategoryDto } from "./types";

/** `GET /categories` → 200 categorias ordenadas por nome (`active` só para ADMIN) | 401. */
export function listCategories(accessToken: string): Promise<Category[]> {
  return apiFetch<Category[]>("/categories", { accessToken });
}

/** `POST /categories` → 201 `{ id, name, active }` | 400, 401, 403, 409 nome duplicado. */
export function createCategory(accessToken: string, dto: CreateCategoryDto): Promise<Category> {
  return apiFetch<Category>("/categories", { method: "POST", body: dto, accessToken });
}

/**
 * `PATCH /categories/{id}` → 200 `{ id, name, active }` | 400, 401, 403, 404, 409.
 * Renomear manda só `{ name }`; ativar/desativar manda só `{ active }`.
 */
export function updateCategory(
  accessToken: string,
  id: string,
  dto: UpdateCategoryDto,
): Promise<Category> {
  return apiFetch<Category>(`/categories/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: dto,
    accessToken,
  });
}
