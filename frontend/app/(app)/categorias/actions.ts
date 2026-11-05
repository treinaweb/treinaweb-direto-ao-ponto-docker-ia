"use server";

import { refresh } from "next/cache";
import { MESSAGES, isApiError, parseValidationMessages, toUserMessage } from "@/lib/api/errors";
import { createCategory, updateCategory } from "@/lib/api/categories";
import { withSession } from "@/lib/auth/session-action";
import type { CategoryNameState, CategoryToggleState } from "@/lib/categories/form-state";
import { CATEGORY_TEXT } from "@/lib/categories/messages";
import {
  CATEGORY_MESSAGES,
  createCategorySchema,
  renameCategorySchema,
  toggleCategorySchema,
} from "@/lib/validation/categories";
import { issuesToFieldErrors, readFormFields } from "@/lib/validation/form";

/** Mensagens pt-BR para as violações 400 da API sobre o nome. */
const API_FIELD_MESSAGES = { name: { fallback: CATEGORY_MESSAGES.nameLength } };

/**
 * Traduz a falha de criar/renomear em estado do diálogo. 404 relê a lista
 * (`refresh()`) e fecha o diálogo com a explicação; os demais erros mantêm o
 * diálogo aberto com o nome exatamente como foi digitado.
 */
function nameErrorState(error: unknown, name: string): CategoryNameState {
  if (!isApiError(error)) throw error;
  const values = { name };

  switch (error.status) {
    case 409:
      return { fieldErrors: { name: CATEGORY_TEXT.duplicateName }, values };
    case 404:
      refresh();
      return { gone: true };
    case 400: {
      const fieldErrors = issuesToFieldErrors(
        parseValidationMessages(error.messages),
        API_FIELD_MESSAGES,
      );
      return fieldErrors ? { fieldErrors, values } : { formError: MESSAGES.invalidData, values };
    }
    default:
      return { formError: toUserMessage(error), values };
  }
}

/** Cria a categoria (`POST /categories`). A unicidade é decidida pela API (409). */
export async function createCategoryAction(
  _prev: CategoryNameState,
  formData: FormData,
): Promise<CategoryNameState> {
  const { name } = readFormFields(formData, ["name"]);

  const parsed = createCategorySchema.safeParse({ name });
  if (!parsed.success) {
    return { fieldErrors: { name: CATEGORY_MESSAGES.nameLength }, values: { name } };
  }

  try {
    await withSession((token) => createCategory(token, { name: parsed.data.name }));
  } catch (error) {
    return nameErrorState(error, name);
  }

  refresh();
  return { done: { notice: CATEGORY_TEXT.created } };
}

/**
 * Renomeia a categoria (`PATCH` só com `{ name }`, o estado não muda). Se o
 * nome (com trim) for igual ao atual, fecha sem chamar a API; a comparação
 * diferencia maiúsculas de minúsculas, como a API.
 */
export async function renameCategoryAction(
  _prev: CategoryNameState,
  formData: FormData,
): Promise<CategoryNameState> {
  const fields = readFormFields(formData, ["categoryId", "name", "currentName"]);
  const values = { name: fields.name };

  const parsed = renameCategorySchema.safeParse(fields);
  if (!parsed.success) {
    const nameInvalid = parsed.error.issues.some((issue) => issue.path[0] === "name");
    return nameInvalid
      ? { fieldErrors: { name: CATEGORY_MESSAGES.nameLength }, values }
      : { formError: MESSAGES.invalidData, values };
  }

  const { categoryId, name, currentName } = parsed.data;
  if (name === currentName) {
    return { done: {} };
  }

  try {
    await withSession((token) => updateCategory(token, categoryId, { name }));
  } catch (error) {
    return nameErrorState(error, fields.name);
  }

  refresh();
  return { done: { notice: CATEGORY_TEXT.renamed } };
}

/** Ativa ou desativa a categoria (`PATCH` só com `{ active }`), sem confirmação. */
export async function toggleCategoryAction(
  _prev: CategoryToggleState,
  formData: FormData,
): Promise<CategoryToggleState> {
  const parsed = toggleCategorySchema.safeParse(readFormFields(formData, ["intent"]).intent);
  if (!parsed.success) {
    return { error: MESSAGES.invalidData };
  }
  const { categoryId, active } = parsed.data;

  try {
    await withSession((token) => updateCategory(token, categoryId, { active }));
  } catch (error) {
    if (!isApiError(error)) throw error;
    if (error.status === 404) {
      refresh();
      return { error: CATEGORY_TEXT.gone };
    }
    return { error: toUserMessage(error) };
  }

  refresh();
  return { notice: active ? CATEGORY_TEXT.activated : CATEGORY_TEXT.deactivated };
}
