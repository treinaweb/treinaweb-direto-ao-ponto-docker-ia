import type { FormState } from "@/lib/auth/form-state";

/** Campos do formulário "Novo usuário". */
export type CreateStaffField = "name" | "email" | "password" | "role";

/** Estado do cadastro de equipe: a senha nunca volta (só nome, e-mail e papel). */
export type CreateStaffState = FormState<CreateStaffField, "name" | "email" | "role">;

/**
 * Resultado da mudança de papel. `notice` (sucesso) e `gone` (404) fecham o
 * diálogo; os demais erros o mantêm aberto. `at` carimba cada estado
 * devolvido, para o cliente distinguir dois resultados iguais seguidos.
 */
export type RoleChangeState = {
  notice?: string;
  error?: string;
  gone?: true;
  at?: number;
};
