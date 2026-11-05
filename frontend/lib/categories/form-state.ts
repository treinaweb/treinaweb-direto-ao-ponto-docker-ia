import type { FormState } from "@/lib/auth/form-state";

/** Campo do diálogo de nome (criar/renomear). */
export type CategoryNameField = "name";

/**
 * Estado das actions de criar e renomear. `values.name` volta bruto (como foi
 * digitado) em qualquer erro. `done` fecha o diálogo (com a mensagem de
 * sucesso, ausente quando o nome não mudou); `gone` indica 404 (categoria que
 * não existe mais), também fechando o diálogo.
 */
export type CategoryNameState = FormState<CategoryNameField, CategoryNameField> & {
  done?: { notice?: string };
  gone?: true;
};

/** Resultado de ativar/desativar: mensagem de sucesso ou de erro (nunca as duas). */
export type CategoryToggleState = { notice?: string; error?: string };
