import { z } from "zod";

// Espelha `CreateCategoryDto`/`UpdateCategoryDto` em docs/api-reference.md
// ("Validações de formulário": `name` de 2 a 60). A unicidade (que diferencia
// maiúsculas de minúsculas) é decidida só pela API: nenhuma regra aqui.

export const CATEGORY_NAME_MIN = 2;
export const CATEGORY_NAME_MAX = 60;

export const CATEGORY_MESSAGES = {
  nameLength: `O nome deve ter entre ${CATEGORY_NAME_MIN} e ${CATEGORY_NAME_MAX} caracteres.`,
} as const;

/** Nome da categoria, com trim antes dos limites. */
export const categoryNameSchema = z
  .string({ message: CATEGORY_MESSAGES.nameLength })
  .trim()
  .min(CATEGORY_NAME_MIN, CATEGORY_MESSAGES.nameLength)
  .max(CATEGORY_NAME_MAX, CATEGORY_MESSAGES.nameLength);

export const createCategorySchema = z.object({ name: categoryNameSchema });

/**
 * Renomear: `currentName` (campo oculto) só serve para evitar um `PATCH`
 * inútil quando o nome não mudou; não decide nenhuma permissão.
 */
export const renameCategorySchema = z.object({
  categoryId: z.uuid(),
  name: categoryNameSchema,
  currentName: z.string(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type RenameCategoryInput = z.infer<typeof renameCategorySchema>;

/**
 * Ativar/desativar: o botão acionado manda `intent` = `activate:<uuid>` ou
 * `deactivate:<uuid>`, convertido em `{ categoryId, active }`.
 */
export const toggleCategorySchema = z
  .string()
  .transform((intent, ctx) => {
    const [action, categoryId = "", ...rest] = intent.split(":");
    if (rest.length > 0 || (action !== "activate" && action !== "deactivate")) {
      ctx.addIssue({ code: "custom", message: "Ação inválida." });
      return z.NEVER;
    }
    return { categoryId, active: action === "activate" };
  })
  .pipe(z.object({ categoryId: z.uuid(), active: z.boolean() }));

export type ToggleCategoryInput = z.infer<typeof toggleCategorySchema>;
